export default {
  title: "IceScope",
  description: "Cross-platform desktop explorer for Apache Iceberg",
  base: "/icescope/",
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  ignoreDeadLinks: false,
  head: [
    ["link", { rel: "icon", href: "/icescope/logo.png" }],
    ["link", { rel: "stylesheet", href: "/icescope/custom.css" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "IceScope" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Explore Apache Iceberg catalogs, metadata, and data from one desktop application.",
      },
    ],
  ],
  themeConfig: {
    logo: "/logo.png",
    siteTitle: "IceScope",
    search: {
      provider: "local",
    },
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Download", link: "/download" },
      { text: "Features", link: "/features" },
      { text: "Roadmap", link: "/roadmap" },
      { text: "GitHub", link: "https://github.com/muhammad-rajib/icescope" },
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Download", link: "/download" },
          { text: "Installation", link: "/installation" },
          { text: "Quick Start", link: "/getting-started" },
        ],
      },
      {
        text: "Using IceScope",
        items: [
          { text: "Connections", link: "/connections" },
          { text: "Explorer", link: "/explorer" },
          { text: "SQL Lab", link: "/sql-lab" },
          { text: "Settings", link: "/settings" },
        ],
      },
      {
        text: "Iceberg",
        items: [
          { text: "Catalogs", link: "/catalogs" },
          { text: "Storage", link: "/storage" },
          { text: "Metadata", link: "/metadata" },
          { text: "Snapshots", link: "/snapshots" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Architecture", link: "/architecture" },
          { text: "Roadmap", link: "/roadmap" },
          { text: "Contributing", link: "/contributing" },
          { text: "FAQ", link: "/faq" },
          { text: "Troubleshooting", link: "/troubleshooting" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/muhammad-rajib/icescope" },
    ],
    footer: {
      message: "Released under the Apache-2.0 License.",
      copyright: "Copyright © 2026 IceScope contributors",
    },
    editLink: {
      pattern: "https://github.com/muhammad-rajib/icescope/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
};
