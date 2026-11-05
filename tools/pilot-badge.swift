import AppKit
import Foundation
// Fanal pilot badge — the agent announces itself on the desktop.
// Reads /tmp/pilot-badge.txt every second; red when it starts with "⚠".
let panel = NSPanel(contentRect: NSRect(x: 40, y: 60, width: 360, height: 44), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
panel.level = .statusBar
panel.isOpaque = false
panel.backgroundColor = NSColor(calibratedRed: 0.30, green: 0.42, blue: 0.996, alpha: 0.92)
panel.hasShadow = true
panel.isMovable = true
panel.ignoresMouseEvents = false
let label = NSTextField(labelWithString: "🤖 DSH pilote cet ordinateur…")
label.font = NSFont.boldSystemFont(ofSize: 14)
label.textColor = .white
label.frame = NSRect(x: 14, y: 10, width: 340, height: 26)
panel.contentView?.addSubview(label)
panel.orderFrontRegardless()
let app = NSApplication.shared
Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
  do {
    let t = try String(contentsOfFile: "/tmp/pilot-badge.txt", encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
    if !t.isEmpty {
      label.stringValue = t
      panel.backgroundColor = t.hasPrefix("⚠") ? NSColor(calibratedRed: 0.94, green: 0.27, blue: 0.23, alpha: 0.94) : NSColor(calibratedRed: 0.30, green: 0.42, blue: 0.996, alpha: 0.92)
    }
  } catch {}
}
app.run()
