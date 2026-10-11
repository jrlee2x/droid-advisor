import sys, traceback
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from droid_advisor.app import DroidAdvisorApp
from droid_advisor.vision import game_window_rect
try:
 app=DroidAdvisorApp()
 app.config["automatic_updates"]=False
 app.diagnostics.enable_detailed(600)
 def report():
  Path(__file__).with_name("live-report.txt").write_text(app.diagnostics.report("1.3.4-dev",app.config,game_window_rect())+"\nPending: "+str(app.pending_count)+"\nDisplayed: "+str(app.displayed_advice.message if app.displayed_advice else None),encoding="utf-8")
  app.root.after(2000,report)
 app.root.after(2000,report)
 app.run()
except BaseException:
 Path(__file__).with_name("live-error.txt").write_text(traceback.format_exc())
