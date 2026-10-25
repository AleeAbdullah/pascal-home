// Rasterise an SVG to PNG using WebKit (reliable SVG support incl. dashes, patterns, fonts).
// Build:  swiftc -O scripts/svg2png.swift -o svg2png
// Usage:  svg2png in.svg out.png [scale=2]
// The SVG must carry numeric width/height attributes (CSS px).
import AppKit
import WebKit

let args = CommandLine.arguments
guard args.count >= 3 else { FileHandle.standardError.write("usage: svg2png in.svg out.png [scale]\n".data(using: .utf8)!); exit(2) }
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let scale = args.count > 3 ? (Double(args[3]) ?? 2) : 2

let text = (try? String(contentsOf: inURL, encoding: .utf8)) ?? ""
func attr(_ name: String) -> Double {
    guard let r = text.range(of: "<svg[^>]*?\\s\(name)=\"([0-9.]+)", options: .regularExpression) else { return 0 }
    let s = String(text[r]); let q = s.components(separatedBy: "\(name)=\"").last ?? "0"
    return Double(q) ?? 0
}
let w = attr("width"), h = attr("height")
guard w > 0, h > 0 else { FileHandle.standardError.write("svg needs width/height\n".data(using: .utf8)!); exit(2) }

final class Delegate: NSObject, WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            let cfg = WKSnapshotConfiguration()
            cfg.rect = CGRect(x: 0, y: 0, width: w, height: h)
            cfg.snapshotWidth = NSNumber(value: w)
            webView.takeSnapshot(with: cfg) { img, err in
                guard let img = img else { FileHandle.standardError.write("snapshot failed \(String(describing: err))\n".data(using: .utf8)!); exit(1) }
                let pw = Int((w * scale).rounded()), ph = Int((h * scale).rounded())
                let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pw, pixelsHigh: ph, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
                NSGraphicsContext.saveGraphicsState()
                NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
                NSColor.white.setFill(); NSRect(x: 0, y: 0, width: pw, height: ph).fill()
                NSGraphicsContext.current?.imageInterpolation = .high
                img.draw(in: NSRect(x: 0, y: 0, width: pw, height: ph))
                NSGraphicsContext.restoreGraphicsState()
                try? rep.representation(using: .png, properties: [:])!.write(to: outURL)
                exit(0)
            }
        }
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { FileHandle.standardError.write("load failed \(error)\n".data(using: .utf8)!); exit(1) }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let web = WKWebView(frame: CGRect(x: 0, y: 0, width: w, height: h))
let del = Delegate()
web.navigationDelegate = del
let win = NSWindow(contentRect: CGRect(x: -20000, y: -20000, width: w, height: h), styleMask: .borderless, backing: .buffered, defer: false)
win.contentView = web
win.orderBack(nil)
web.loadFileURL(inURL, allowingReadAccessTo: inURL.deletingLastPathComponent())
DispatchQueue.main.asyncAfter(deadline: .now() + 60) { FileHandle.standardError.write("timeout\n".data(using: .utf8)!); exit(1) }
app.run()
