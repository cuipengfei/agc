import signal
import subprocess
import sys

cmd = sys.argv[sys.argv.index('--') + 1:]
process = subprocess.Popen(cmd)
signal.signal(signal.SIGTERM, lambda *_: process.terminate())
signal.signal(signal.SIGINT, lambda *_: process.terminate())
raise SystemExit(process.wait())
