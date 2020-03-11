const path = require('path');
const _ = require('lodash');

// Remove trailing slash
exports.onCreatePage = ({ page, actions }) => {
  const { createPage, deletePage } = actions;

  return new Promise((resolve, reject) => {
    // Remove trailing slash
    const newPage = Object.assign({}, page, {
      path: page.path === `/` ? page.path : page.path.replace(/\/$/, ``),
    });

    if (newPage.path !== page.path) {
      // Remove the old page
      deletePage(page);
      // Add the new page
      createPage(newPage);
    }

    resolve();
  });
};

// Create pages from markdown nodes
exports.createPages = ({ actions, createContentDigest, createNodeId, graphql }) => {
  const { createPage, createNode } = actions;
  const slideTemplate = path.resolve(`src/templates/slide.js`);

  return graphql(`
    {
      allMarkdownRemark {
        edges {
          node {
            fileAbsolutePath
            html
          }
        }
      }
    }
  `).then(result => {
    if (result.errors) {
      return Promise.reject(result.errors);
    }

    const slides = result.data.allMarkdownRemark.edges;
    slides.sort((a, b) => a.node.fileAbsolutePath > b.node.fileAbsolutePath ? 1 : -1)
    const nodes = slides.flatMap((s) => s.node.html.split('<hr>').map((html) => ({
      node: s.node, html
    })));

    var deck_id = 0;
    var i = 0;
    var lastSlug = undefined;
    nodes.forEach(({ node, html }, index) => {
      const slug = node.fileAbsolutePath.slice(-6,-3);
      console.log(`slug: ${slug}`)

      // need to reset index to 1 after slug changes
      console.log(slug, lastSlug)
      if (slug !== lastSlug && lastSlug !== undefined) {
        console.log("RESET i")
        i = 0
        deck_id += 1 // update deck_id for index
      }

      console.log(`NODEID: ${node.id}`)
      createNode({
        id: createNodeId(`${node.id}_${deck_id*1000 + i + 1} >>> Slide`),
        parent: node.id,
        children: [],
        internal: {
          type: `Slide`,
          contentDigest: createContentDigest(html),
        },
        html: html,
        index: deck_id*1000 + i + 1,
        deck: deck_id
      });

      i += 1;
      lastSlug = slug;
    });


    // creates the pages but the content is wrong
    deck_id = 0;
    i = 0;
    lastSlug = undefined;
    nodes.forEach((slide, index) => {

      // splice string .../paradigm.md ==> paradigm
      const slug = slide.node.fileAbsolutePath.slice(-6,-3)
      console.log(`slug: ${slug}`)

      // need to reset index to 1 after slug changes
      console.log(slug, lastSlug)
      if (slug !== lastSlug && lastSlug !== undefined) {
        console.log("RESET i")
        i = 0
        deck_id += 1
      }
      

      createPage({
        path: `/${slug}/${i + 1}`,
        component: slideTemplate,
        context: {
          index: deck_id*1000 + i + 1,
          absolutePath: process.cwd() + `/src/slides#${deck_id*1000 + i + 1}`,
          deck: deck_id
        },
      });

      i += 1;
      lastSlug = slug;
    });
  });
};

exports.sourceNodes = ({ actions }) => {
  actions.createTypes(`
    type Slide implements Node {
      html: String
      index: Int
      deck: Int
    }
  `);
};
