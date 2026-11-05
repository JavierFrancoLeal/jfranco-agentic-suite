import AppKit
import Foundation
// Fanal pilot badge v2 — the remote-control style: a SLIM TOP BAR
// (like Chrome Remote Desktop / TeamViewer's edge strip), never covers
// the work area. Blue while active, red on warning. Elapsed time live.
let scr = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
let bar = NSPanel(contentRect: NSRect(x: 0, y: scr.maxY - 64, width: scr.width, height: 30), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
bar.level = .statusBar
bar.isOpaque = false
bar.backgroundColor = NSColor(calibratedRed: 0.30, green: 0.42, blue: 0.996, alpha: 0.88)
bar.hasShadow = true
bar.isMovable = false
bar.ignoresMouseEvents = true
let label = NSTextField(labelWithString: "🤖 DSH pilote cet ordinateur · depuis 0 min")
label.font = NSFont.systemFont(ofSize: 12.5, weight: .semibold)
label.textColor = .white
label.alignment = .center
label.frame = NSRect(x: 0, y: 5, width: scr.width, height: 22)
bar.contentView?.addSubview(label)
bar.orderFrontRegardless()
let app = NSApplication.shared
let started = Date()
var warned = false
Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
  let el = Int(Date().timeIntervalSince(started))
  if !warned {
    label.stringValue = "🤖 DSH pilote cet ordinateur · depuis \(el/60) min \(el%60) s"
  }
  do {
    let t = try String(contentsOfFile: "/tmp/pilot-badge.txt", encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
    if !t.isEmpty {
      label.stringValue = t.hasPrefix("⚠") ? t : "🤖 \(t)"
      warned = t.hasPrefix("⚠")
      bar.backgroundColor = t.hasPrefix("⚠") ? NSColor(calibratedRed: 0.94, green: 0.27, blue: 0.23, alpha: 0.94) : NSColor(calibratedRed: 0.30, green: 0.42, blue: 0.996, alpha: 0.88)
    }
  } catch {}
}
app.run()
