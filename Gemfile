source "https://rubygems.org"

ruby "3.3.0"

# Mirrors the exact gem set GitHub Pages runs in production.
gem "github-pages", group: :jekyll_plugins

# Ruby 4.0+ compatibility (stdlib modules moved out of defaults)
gem "csv"
gem "base64"
gem "bigdecimal"

# Local serving niceties
gem "webrick", "~> 1.8"

platforms :windows do
  gem "wdm", ">= 0.1.0"
  gem "tzinfo", ">= 1"
  gem "tzinfo-data"
end
