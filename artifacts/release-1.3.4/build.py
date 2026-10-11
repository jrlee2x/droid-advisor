import subprocess, pathlib, hashlib, shutil
root=pathlib.Path(__file__).resolve().parents[2]
release=root/'artifacts/release-1.3.4'
with (release/'build.log').open('w') as log:
 for cmd in ([str(root/'droid_advisor/.venv/Scripts/python.exe'),'-m','PyInstaller','--noconfirm','DroidAdvisor.spec'],[r'C:\Users\JoshuaLee\AppData\Local\Programs\Inno Setup 6\ISCC.exe','installer.iss']):
  subprocess.run(cmd,cwd=root/'droid_advisor',stdout=log,stderr=subprocess.STDOUT,check=True,creationflags=subprocess.CREATE_NO_WINDOW)
installer=root/'droid_advisor/dist-installer/DroidAdvisor-Setup-1.3.4.exe'
sha=hashlib.sha256(installer.read_bytes()).hexdigest()
side=installer.with_suffix('.exe.sha256'); side.write_text(sha+'  '+installer.name+'\n',encoding='ascii')
shutil.copy2(installer,release/installer.name); shutil.copy2(side,release/side.name)
print(installer.stat().st_size,sha,flush=True)
