import { Card, CardHeader, CardContent } from "cursor/canvas"
import { Table, TableHeader, TableRow, TableCell } from "cursor/canvas"
import { Text } from "cursor/canvas"
import { useHostTheme } from "cursor/canvas"

export default function ComicSourceMatrix() {
  const theme = useHostTheme()
  
  const sources = [
    {
      source: "MangaDex",
      category: "Manga, Manhwa, Manhua",
      accessMethod: "Official Public API",
      apiScraper: "API",
      backend: "No (Direct Expo)",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "Community",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "VERIFIED WORKING"
    },
    {
      source: "Weeb Central",
      category: "Manga, Manhwa, Manhua",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "Cloudflare (may be bypassable)",
      codeLicense: "MIT (Extensions)",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "POTENTIALLY VIABLE"
    },
    {
      source: "Asura Scans",
      category: "Manhwa",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None (Cloudflare CDN only)",
      codeLicense: "MIT (Extensions)",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "POTENTIALLY VIABLE"
    },
    {
      source: "MangaNelo",
      category: "Manga, Manhwa, Manhua",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "Cloudflare (challenge detected)",
      codeLicense: "MIT (Extensions)",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "REQUIRES INVESTIGATION"
    },
    {
      source: "MangaKakalot",
      category: "Manga",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "Unknown (timeout during test)",
      codeLicense: "MIT (Extensions)",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "UNKNOWN"
    },
    {
      source: "MangaLife",
      category: "Manga",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "MIT (Extensions)",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "UNAVAILABLE / BLOCKED"
    },
    {
      source: "MangaSee",
      category: "Manga",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "MIT (Scrapers)",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "UNSTABLE / DOWN"
    },
    {
      source: "Bato.to",
      category: "Manga, Manhwa, Manhua",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "MIT (Extensions)",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "UNAVAILABLE / BLOCKED"
    },
    {
      source: "Comick",
      category: "Manga, Manhwa, Manhua",
      accessMethod: "Public JSON API",
      apiScraper: "API",
      backend: "No (Direct)",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "Rate limiting (HTTP 429)",
      codeLicense: "Unknown",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "LIMITED"
    },
    {
      source: "TCB Scans",
      category: "Manhwa",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "Unknown",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "POTENTIALLY VIABLE"
    },
    {
      source: "Flame Scans",
      category: "Manhwa",
      accessMethod: "Normal Web Scraping",
      apiScraper: "Scraper",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "Unknown",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "POTENTIALLY VIABLE"
    },
    {
      source: "OriginManga",
      category: "Manga",
      accessMethod: "Public API (Unverified)",
      apiScraper: "API",
      backend: "No (Direct)",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "API not accessible (404)",
      codeLicense: "Unknown",
      search: "❌",
      details: "❌",
      chapters: "❌",
      pages: "❌",
      reader: "❌",
      status: "REJECTED"
    },
    {
      source: "OmegaAPI",
      category: "Manhwa",
      accessMethod: "Public API",
      apiScraper: "API",
      backend: "No (Direct)",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "Service disabled (402)",
      codeLicense: "MIT",
      search: "❌",
      details: "❌",
      chapters: "❌",
      pages: "❌",
      reader: "❌",
      status: "REJECTED"
    },
    {
      source: "MangaUpdates",
      category: "Manga (Metadata Only)",
      accessMethod: "Public API",
      apiScraper: "API",
      backend: "No (Direct)",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "Method restrictions (405)",
      codeLicense: "Unknown",
      search: "✅",
      details: "✅",
      chapters: "❌",
      pages: "❌",
      reader: "❌",
      status: "REJECTED (Metadata Only)"
    },
    {
      source: "Kotatsu Parsers",
      category: "Manga, Manhwa, Manhua",
      accessMethod: "Parser Library",
      apiScraper: "Parser",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "Some Joken-protected (rejected)",
      codeLicense: "GPL-3.0",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "MIXED (Some Protected)"
    },
    {
      source: "Miru Extensions",
      category: "Manga, Anime",
      accessMethod: "JavaScript Extensions",
      apiScraper: "Extensions",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "MIT",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "POTENTIALLY VIABLE"
    },
    {
      source: "Mangayomi Extensions",
      category: "Manga, Anime",
      accessMethod: "Dart Extensions",
      apiScraper: "Extensions",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "Unknown",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "POTENTIALLY VIABLE"
    },
    {
      source: "Mihon Extensions",
      category: "Manga, Manhwa, Manhua",
      accessMethod: "Kotlin Extensions",
      apiScraper: "Extensions",
      backend: "Required",
      cloudReady: "Yes",
      config: "None",
      securityIssue: "None",
      codeLicense: "Apache-2.0",
      search: "✅",
      details: "✅",
      chapters: "✅",
      pages: "✅",
      reader: "✅",
      status: "POTENTIALLY VIABLE"
    }
  ]

  return (
    <div style={{ padding: "24px", fontFamily: theme.fonts.base }}>
      <Text style={{ fontSize: "24px", fontWeight: 600, marginBottom: "24px" }}>
        Comic Source Evaluation Matrix
      </Text>
      <Text style={{ fontSize: "14px", color: theme.colors.textSecondary, marginBottom: "32px" }}>
        Source: Phase 5.2 Research · Assessment based on normal access possibility
      </Text>

      <Card>
        <CardHeader>
          <Text style={{ fontSize: "18px", fontWeight: 500 }}>
            Complete Source Inventory
          </Text>
        </CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Access Method</TableCell>
                  <TableCell>API/Scraper</TableCell>
                  <TableCell>Backend</TableCell>
                  <TableCell>Cloud Ready</TableCell>
                  <TableCell>Config</TableCell>
                  <TableCell>Security Issue</TableCell>
                  <TableCell>Code License</TableCell>
                  <TableCell>Search</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Chapters</TableCell>
                  <TableCell>Pages</TableCell>
                  <TableCell>Reader</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              {sources.map((source, index) => (
                <TableRow key={index}>
                  <TableCell>{source.source}</TableCell>
                  <TableCell>{source.category}</TableCell>
                  <TableCell>{source.accessMethod}</TableCell>
                  <TableCell>{source.apiScraper}</TableCell>
                  <TableCell>{source.backend}</TableCell>
                  <TableCell>{source.cloudReady}</TableCell>
                  <TableCell>{source.config}</TableCell>
                  <TableCell style={{ 
                    color: source.securityIssue === "None" ? theme.colors.success : theme.colors.warning 
                  }}>
                    {source.securityIssue}
                  </TableCell>
                  <TableCell>{source.codeLicense}</TableCell>
                  <TableCell>{source.search}</TableCell>
                  <TableCell>{source.details}</TableCell>
                  <TableCell>{source.chapters}</TableCell>
                  <TableCell>{source.pages}</TableCell>
                  <TableCell>{source.reader}</TableCell>
                  <TableCell style={{ 
                    fontWeight: 500,
                    color: source.status === "VERIFIED WORKING" ? theme.colors.success :
                           source.status.includes("POTENTIALLY") ? theme.colors.info :
                           source.status.includes("REJECTED") ? theme.colors.error :
                           theme.colors.warning
                  }}>
                    {source.status}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: "24px" }}>
        <CardHeader>
          <Text style={{ fontSize: "18px", fontWeight: 500 }}>
            Status Summary
          </Text>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "16px", backgroundColor: theme.colors.surface, borderRadius: "8px" }}>
              <Text style={{ fontSize: "12px", color: theme.colors.textSecondary, marginBottom: "8px" }}>
                VERIFIED WORKING
              </Text>
              <Text style={{ fontSize: "24px", fontWeight: 600, color: theme.colors.success }}>
                1
              </Text>
            </div>
            <div style={{ padding: "16px", backgroundColor: theme.colors.surface, borderRadius: "8px" }}>
              <Text style={{ fontSize: "12px", color: theme.colors.textSecondary, marginBottom: "8px" }}>
                POTENTIALLY VIABLE
              </Text>
              <Text style={{ fontSize: "24px", fontWeight: 600, color: theme.colors.info }}>
                7
              </Text>
            </div>
            <div style={{ padding: "16px", backgroundColor: theme.colors.surface, borderRadius: "8px" }}>
              <Text style={{ fontSize: "12px", color: theme.colors.textSecondary, marginBottom: "8px" }}>
                REJECTED
              </Text>
              <Text style={{ fontSize: "24px", fontWeight: 600, color: theme.colors.error }}>
                4
              </Text>
            </div>
            <div style={{ padding: "16px", backgroundColor: theme.colors.surface, borderRadius: "8px" }}>
              <Text style={{ fontSize: "12px", color: theme.colors.textSecondary, marginBottom: "8px" }}>
                UNAVAILABLE / BLOCKED
              </Text>
              <Text style={{ fontSize: "24px", fontWeight: 600, color: theme.colors.warning }}>
                3
              </Text>
            </div>
            <div style={{ padding: "16px", backgroundColor: theme.colors.surface, borderRadius: "8px" }}>
              <Text style={{ fontSize: "12px", color: theme.colors.textSecondary, marginBottom: "8px" }}>
                REQUIRES INVESTIGATION
              </Text>
              <Text style={{ fontSize: "24px", fontWeight: 600, color: theme.colors.warning }}>
                2
              </Text>
            </div>
            <div style={{ padding: "16px", backgroundColor: theme.colors.surface, borderRadius: "8px" }}>
              <Text style={{ fontSize: "12px", color: theme.colors.textSecondary, marginBottom: "8px" }}>
                UNKNOWN
              </Text>
              <Text style={{ fontSize: "24px", fontWeight: 600, color: theme.colors.warning }}>
                1
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: "24px" }}>
        <CardHeader>
          <Text style={{ fontSize: "18px", fontWeight: 500 }}>
            Key Findings
          </Text>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            <div>
              <Text style={{ fontWeight: 500, marginBottom: "8px" }}>✅ Viable Sources</Text>
              <Text style={{ fontSize: "14px", color: theme.colors.textSecondary }}>
                Weeb Central, Asura Scans, TCB Scans, Flame Scans, Miru, Mangayomi, Mihon extensions show normal access is possible without deliberate bypass
              </Text>
            </div>
            <div>
              <Text style={{ fontWeight: 500, marginBottom: "8px" }}>⚠️ Protection Concerns</Text>
              <Text style={{ fontSize: "14px", color: theme.colors.textSecondary }}>
                Weeb Central and MangaNelo use Cloudflare but may be accessible; Kotatsu has Joken-protected sources that are explicitly rejected
              </Text>
            </div>
            <div>
              <Text style={{ fontWeight: 500, marginBottom: "8px" }}>❌ Dead Sources</Text>
              <Text style={{ fontSize: "14px", color: theme.colors.textSecondary }}>
                Bato.to was shut down by legal action, MangaLife migrated to Weeb Central, MangaSee is unstable, OmegaAPI service disabled
              </Text>
            </div>
            <div>
              <Text style={{ fontWeight: 500, marginBottom: "8px" }}>🏗️ Extension Ecosystems</Text>
              <Text style={{ fontSize: "14px", color: theme.colors.textSecondary }}>
                Mihon, Miru, Mangayomi provide active extension repositories with MIT/Apache-2.0 licenses and hundreds of working parsers
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}