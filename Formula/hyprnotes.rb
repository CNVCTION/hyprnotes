class Hyprnotes < Formula
  desc "Dead-simple CLI notepad with minimalist TUI"
  homepage "https://github.com/CNVCTION/hyprnotes"
  url "https://github.com/CNVCTION/hyprnotes/archive/refs/tags/v1.0.1.tar.gz"
  sha256 "90c8a89ec3000ac1ee8da52b35ee167df020d2bda50b81f73eafce64174dd30c"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install"
    system "npm", "run", "build"
    bin.install "dist/index.js" => "hyprnotes"
  end
end
