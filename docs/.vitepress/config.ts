import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Mariner',
  description: 'Microfrontend framework built on Vite 8',
  base: '/mariner/',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/mariner/logo.svg' }]],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/getting-started/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/vue-app' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/Xenossolitarius/mariner' },
          { text: 'npm', link: 'https://www.npmjs.com/package/mariner-fe' },
          { text: 'Changelog', link: 'https://github.com/Xenossolitarius/mariner/blob/main/CHANGELOG.md' },
        ],
      },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'Project Structure', link: '/getting-started/project-structure' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Navigators', link: '/guide/navigators' },
            { text: 'Virtual Modules', link: '/guide/virtual-modules' },
            { text: 'Fleets', link: '/guide/fleets' },
            { text: 'Cargo', link: '/guide/cargo' },
            { text: 'Serve Mode', link: '/guide/serve-mode' },
          ],
        },
        {
          text: 'Framework Guides',
          items: [
            { text: 'Vue', link: '/guide/vue' },
            { text: 'React', link: '/guide/react' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Environment Variables', link: '/guide/environment' },
            { text: 'Type Generation', link: '/guide/type-generation' },
            { text: 'Dev Server Architecture', link: '/guide/dev-server' },
            { text: 'Building for Production', link: '/guide/building' },
            { text: 'Constraints & Rules', link: '/guide/constraints' },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'Project Structure', link: '/getting-started/project-structure' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Navigators', link: '/guide/navigators' },
            { text: 'Virtual Modules', link: '/guide/virtual-modules' },
            { text: 'Fleets', link: '/guide/fleets' },
            { text: 'Cargo', link: '/guide/cargo' },
            { text: 'Serve Mode', link: '/guide/serve-mode' },
          ],
        },
        {
          text: 'Framework Guides',
          items: [
            { text: 'Vue', link: '/guide/vue' },
            { text: 'React', link: '/guide/react' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Environment Variables', link: '/guide/environment' },
            { text: 'Type Generation', link: '/guide/type-generation' },
            { text: 'Dev Server Architecture', link: '/guide/dev-server' },
            { text: 'Building for Production', link: '/guide/building' },
            { text: 'Constraints & Rules', link: '/guide/constraints' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Config', link: '/api/config' },
            { text: 'Navigator', link: '/api/navigator' },
            { text: 'Plugins', link: '/api/plugins' },
            { text: 'Constants', link: '/api/constants' },
            { text: 'CLI', link: '/api/cli' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Vue App', link: '/examples/vue-app' },
            { text: 'React App', link: '/examples/react-app' },
            { text: 'Shared State', link: '/examples/shared-state' },
            { text: 'Cargo Data', link: '/examples/cargo-data' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Xenossolitarius/mariner' }],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/Xenossolitarius/mariner/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
    },
  },
})
