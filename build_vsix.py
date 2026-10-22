#!/usr/bin/env python3
"""Package the Stream Code VS Code extension and install it.

Builds stream-code-<version>.vsix from extension/ plus stream_code.html (bundled as
extension/overlay.html so the extension can serve it), then runs
`code --install-extension` on it. stdlib only, no npm / vsce needed.

Screenshots on the extension page: VS Code shows an extension's README in a webview that
only displays public https: images. It strips data: and relative image sources (checked
against VS Code 1.143), so images/x.webp shows as a broken image. Publish the images
somewhere public and set IMAGES_BASE_URL (or pass --images-base-url=https://...): the
packaged README then points at <base>/<file>?v=<version>. With no base URL the images are
left out of the packaged README, so the page shows no broken placeholders. The README in
the repo keeps its relative paths either way, so it still renders on GitHub and in the
markdown preview.

    python build_vsix.py              build + install
    python build_vsix.py --no-install build only
    python build_vsix.py --images-base-url=https://example.pages.dev/stream-code
    python build_vsix.py --marketplace   package for the VS Code Marketplace with vsce (no upload)
"""
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile

debug = False

HERE = os.path.dirname(os.path.abspath(__file__))
EXT_DIR = os.path.join(HERE, "extension")
OVERLAY = os.path.join(HERE, "stream_code.html")
EXT_FILES = ["package.json", "extension.js", "server.js", "icon.png", "LICENSE", "CHANGELOG.md"]  # README.md is written separately
STAGE_DIR = os.path.join(HERE, "build", "marketplace")  # --marketplace: what Microsoft's vsce packages
README = os.path.join(EXT_DIR, "README.md")

# Public https folder holding the files of extension/images (see the docstring). Empty = no images on the page.
IMAGES_BASE_URL = "https://stream-code.pages.dev"  # Cloudflare Pages project "stream-code"; see publish-images.bat

# ![alt](relative/path): any image that isn't already an http(s) URL
IMAGE_LINK = re.compile(r"!\[([^\]]*)\]\((?!https?:)([^)\s]+)\)")
TABLE_OR_BLANK = re.compile(r"^[\s|:-]*$")
# a table header + separator left with no rows once its image rows are gone
EMPTY_TABLE = re.compile(r"(?m)^\|[\s|]*\|[ \t]*\n\|[\s|:-]*-[\s|:-]*\|[ \t]*\n(?!\|)")


def images_base_url():
    for arg in sys.argv[1:]:
        if arg.startswith("--images-base-url="):
            return arg.split("=", 1)[1].strip()
    return IMAGES_BASE_URL.strip()


def packaged_readme(base_url, version):
    """The README for the package: relative images point at base_url, or are dropped when it is empty.
    Returns (text, linked, dropped)."""
    if base_url and not base_url.startswith("https://"):
        sys.exit("--images-base-url must be an https:// URL: VS Code's extension page shows no other images")
    with open(README, encoding="utf-8") as f:
        lines = f.read().split("\n")
    linked = dropped = 0

    def to_url(m):
        nonlocal linked
        rel = m.group(2)
        path = os.path.normpath(os.path.join(EXT_DIR, rel))
        if not os.path.isfile(path):
            sys.exit(f"README image not found: {rel}")
        linked += 1
        return f"![{m.group(1)}]({base_url.rstrip('/')}/{os.path.basename(path)}?v={version})"

    out = []
    for line in lines:
        if not IMAGE_LINK.search(line):
            out.append(line)
        elif base_url:
            out.append(IMAGE_LINK.sub(to_url, line))
        else:
            dropped += len(IMAGE_LINK.findall(line))
            rest = IMAGE_LINK.sub("", line)
            if not TABLE_OR_BLANK.match(rest):
                out.append(rest)  # keep any real text that shared the line
    text = "\n".join(out)
    if not base_url:
        text = re.sub(r"\n{3,}", "\n\n", EMPTY_TABLE.sub("", text))
    return text, linked, dropped

MANIFEST = """<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{name}" Version="{version}" Publisher="{publisher}" />
    <DisplayName>{display}</DisplayName>
    <Description xml:space="preserve">{description}</Description>
    <Tags>stream,obs,overlay</Tags>
    <Categories>Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{engine}" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui,workspace" />
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
  </Assets>
</PackageManifest>
"""

CONTENT_TYPES = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json" />
  <Default Extension=".vsixmanifest" ContentType="text/xml" />
  <Default Extension=".js" ContentType="application/javascript" />
  <Default Extension=".html" ContentType="text/html" />
  <Default Extension=".md" ContentType="text/markdown" />
  <Default Extension=".png" ContentType="image/png" />
  <Default Extension=".webp" ContentType="image/webp" />
</Types>
"""


def xml_escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def build():
    with open(os.path.join(EXT_DIR, "package.json"), encoding="utf-8") as f:
        pkg = json.load(f)
    name, version, publisher = pkg["name"], pkg["version"], pkg["publisher"]
    out = os.path.join(HERE, f"{name}-{version}.vsix")

    for fn in EXT_FILES:
        if not os.path.isfile(os.path.join(EXT_DIR, fn)):
            sys.exit(f"missing extension/{fn}")
    if not os.path.isfile(OVERLAY):
        sys.exit("missing stream_code.html")
    if not os.path.isfile(README):
        sys.exit("missing extension/README.md")
    base_url = images_base_url()
    readme, linked, dropped = packaged_readme(base_url, version)

    manifest = MANIFEST.format(
        name=name, version=version, publisher=publisher,
        display=xml_escape(pkg.get("displayName", name)),
        description=xml_escape(pkg.get("description", "")),
        engine=xml_escape(pkg["engines"]["vscode"]),
    )
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("extension.vsixmanifest", manifest)
        for fn in EXT_FILES:
            z.write(os.path.join(EXT_DIR, fn), f"extension/{fn}")
        z.writestr("extension/README.md", readme)  # images point at base_url, or are left out
        z.write(OVERLAY, "extension/overlay.html")
        if debug:
            for info in z.infolist():
                print(f"  {info.filename}  {info.file_size} B")
    print(f"built  {out}  ({os.path.getsize(out)} B)")
    if base_url:
        print(f"README images: {linked} linked to {base_url}")
    elif dropped:
        print(f"README images: {dropped} left out (no IMAGES_BASE_URL; the extension page only shows public https images)")
    return out, f"{publisher}.{name}"


def build_marketplace():
    """Package for the VS Code Marketplace with Microsoft's own vsce (via npx), which writes the
    full manifest (icon, license, changelog assets) and runs the Marketplace's checks.
    Produces <name>-<version>-marketplace.vsix; nothing is uploaded."""
    with open(os.path.join(EXT_DIR, "package.json"), encoding="utf-8") as f:
        pkg = json.load(f)
    version = pkg["version"]
    base_url = images_base_url()
    if not base_url:
        sys.exit("--marketplace needs IMAGES_BASE_URL: the Marketplace page only shows https images")
    readme, linked, _ = packaged_readme(base_url, version)
    shutil.rmtree(STAGE_DIR, ignore_errors=True)
    os.makedirs(STAGE_DIR)
    for fn in EXT_FILES:
        shutil.copy2(os.path.join(EXT_DIR, fn), os.path.join(STAGE_DIR, fn))
    with open(os.path.join(STAGE_DIR, "README.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write(readme)
    shutil.copy2(OVERLAY, os.path.join(STAGE_DIR, "overlay.html"))
    with open(os.path.join(STAGE_DIR, ".vscodeignore"), "w") as f:
        f.write("*.vsix\n")
    out = os.path.join(HERE, f"{pkg['name']}-{version}-marketplace.vsix")
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        sys.exit("npx (Node.js) is needed for --marketplace")
    cmd = f'"{npx}" --yes @vscode/vsce package --allow-missing-repository --out "{out}"'
    print("running vsce in", STAGE_DIR)
    r = subprocess.run(cmd, shell=True, cwd=STAGE_DIR)
    if r.returncode != 0:
        sys.exit(f"vsce package failed (exit {r.returncode})")
    print(f"marketplace package: {out}  ({os.path.getsize(out)} B, {linked} README images linked)")
    return out


def install(vsix):
    code = shutil.which("code") or shutil.which("code.cmd")
    if not code:
        print("\n'code' is not on PATH. Install it by hand instead:")
        print("  VS Code -> Extensions view -> '...' menu -> Install from VSIX... ->", vsix)
        return 1
    cmd = f'"{code}" --install-extension "{vsix}" --force'
    if debug:
        print("running:", cmd)
    r = subprocess.run(cmd, shell=True)
    if r.returncode != 0:
        print(f"\ncode --install-extension failed (exit {r.returncode})")
        return r.returncode
    print("\ninstalled. Reload any open VS Code window (Ctrl+Shift+P -> 'Developer: Reload Window')")
    print("then add an OBS browser source pointing at http://127.0.0.1:7331/")
    return 0


if __name__ == "__main__":
    if "--marketplace" in sys.argv:
        build_marketplace()
        sys.exit(0)
    vsix, ext_id = build()
    if "--no-install" in sys.argv:
        sys.exit(0)
    sys.exit(install(vsix))
