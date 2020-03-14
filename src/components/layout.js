import React from "react"
import { Link, useStaticQuery, graphql } from "gatsby"

import { rhythm, scale } from "../utils/typography"
import Image from "gatsby-image"
import catImgSrc from '../../content/assets/icon-192.png';
import meImgSrc from '../../content/assets/me.png';

const Layout = ({ location, title, children }) => {
  const isRootPath = location.pathname === `${__PATH_PREFIX__}/`
  let header;

  title = (() => {
    if (typeof title !== 'string') {
      return title;
    }

    const catIndex = title.indexOf('猫');
    if (catIndex < 0) {
      return title;
    }

    const numAttr = {
      meSize: 40,
      meVerticalAlign: -5,
      catSize: 30,
      catVerticalAlign: -4,
    }
    if (!isRootPath) {
      const scale = 0.6;
      Object.keys(numAttr).forEach(key => {
        numAttr[key] = numAttr[key] * scale;
      });
    }

    return <>
      <img
        src={meImgSrc}
        style={{
          width: numAttr.meSize, height: numAttr.meSize,
          verticalAlign: `${numAttr.meVerticalAlign}px`, margin: '0px 4px 0 0',
          borderRadius: '50%'
        }}
      ></img>
      <span>{title.slice(0, catIndex)}</span>
      <img
        src={catImgSrc}
        style={{
          width: numAttr.catSize, height: numAttr.catSize,
          verticalAlign: `${numAttr.catVerticalAlign}px`, margin: '0 4px',
        }}
      ></img>
      <span>{title.slice(catIndex + 1)}</span>
    </>
  })();

  if (isRootPath) {
    header = (
      <h1
        style={{
          marginBottom: rhythm(1.5),
          marginTop: 0,
        }}
      >
        <Link
          style={{
            boxShadow: `none`,
            textDecoration: `none`,
          }}
          to={`/`}
        >
          {title}
        </Link>
      </h1>
    )
  } else {
    header = (
      <h3
        style={{
          fontFamily: `Montserrat, sans-serif`,
          marginTop: 0,
        }}
      >
        <Link
          style={{
            boxShadow: `none`,
            textDecoration: `none`,
          }}
          to={`/`}
        >
          {title}
        </Link>
      </h3>
    )
  }
  return (
    <div
      style={{
        marginLeft: `auto`,
        marginRight: `auto`,
        maxWidth: rhythm(24),
        padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
      }}
    >
      <header>{header}</header>
      <main>{children}</main>
      <footer>
        © {new Date().getFullYear()}, by MooBall
      </footer>
    </div>
  )
}

export default Layout
