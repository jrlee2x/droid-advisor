# PyInstaller onedir build. Onedir is intentionally used instead of onefile so
# antivirus engines can inspect normal files without unpacking a self-extractor.

from PyInstaller.utils.hooks import collect_all

rapid_data, rapid_bins, rapid_hidden = collect_all("rapidocr_onnxruntime")
ort_data, ort_bins, ort_hidden = collect_all("onnxruntime")

a = Analysis(
    ["launcher.py"],
    pathex=[".."],
    binaries=rapid_bins + ort_bins,
    datas=(
        rapid_data
        + ort_data
        + [
            ("assets/thumbnails", "assets/thumbnails"),
            ("assets/ATTRIBUTION.txt", "assets"),
            ("assets/quality_requirements.json", "assets"),
        ]
    ),
    hiddenimports=rapid_hidden + ort_hidden,
    hookspath=[],
    runtime_hooks=[],
    excludes=["pytest", "setuptools", "pip"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="DroidAdvisor",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="DroidAdvisor",
)
