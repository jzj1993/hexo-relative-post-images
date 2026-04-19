---
title: fixture
summary: "![front matter ignored](./front-matter-ignored.png)"
---

# Relative paths

These are valid refs. If the resolved file is outside source, it will be skipped later.

![cover](cover.jpg)
![title](title-image.png "Title")
![multiline]
(./multiline-image.png)
<img src="./images/demo.webp" alt="demo">
<img src='./images/demo-single.webp' alt='demo single'>
![parent relative](../shared/parent-cover.png)
<img src="../shared/parent-html.png" alt="parent relative html">

This one is also real: ![real](./real-inline-context.png)

# Special characters

These should stay relative. Reserved URL characters should be percent-encoded.

![space encoded](cover%20image.png)
![space angle](<cover image.png>)
![paren encoded](special%28v1%29.png)
![paren angle](<special(v1).png>)
![cjk](中文图片.png)
![cjk space](<中文 图片.png>)
![hash encoded](hash%23name.png)
![query encoded](query%3Fname.png)

# Unsupported standard Markdown image syntax

These are standard reference-style images. They are not illegal Markdown, but this plugin does not resolve them yet.

![full reference][logo]
![collapsed reference][]
![shortcut reference]

[logo]: ./images/logo.png "Logo"
[collapsed reference]: ./images/collapsed.png
[shortcut reference]: ./images/shortcut.png

# Unsupported non-Markdown image syntax

![[obsidian.png]]

# Absolute paths

Site-root absolute paths are intentionally unsupported in this plugin.

![site absolute](/images/site-cover.png)
<img src="/images/site-html.png" alt="absolute html">

# Unsupported OS filesystem absolute paths

These are local filesystem paths, not site-root paths, so they are not supported.

![windows absolute](C:\repo\source\images\cover-win.png)
![windows absolute forward](D:/repo/source/images/cover-win-forward.png)
![windows unc](\\server\share\site\source\images\cover-unc.png)

<img src="C:\images\cover-html.png" alt="windows drive html">
<img src="D:/images/cover-html.png" alt="windows drive forward html">
<img src="\\server\share\cover-html.png" alt="windows unc html">

# Non-local files

![remote](https://example.com/remote.png)
![protocol-relative](//cdn.example.com/demo.png)
![fragment](#only-fragment)
![data-uri](data:image/png;base64,AAAA)
![mailto](mailto:test@example.com)
![tel](tel:123456)

<img src="https://example.com/remote-html.png" alt="remote html">
<img src="//cdn.example.com/demo-html.png" alt="protocol relative html">
<img src="data:image/png;base64,BBBB" alt="data html">
<img src="mailto:test@example.com" alt="mailto html">
<img src="tel:123456" alt="tel html">

# Code blocks and inline code

Inline HTML `<img src="./inline-html.png">` should be ignored.

Inline Markdown `![fake](./inline-md.png)` should be ignored.

```html
<img src="./code-only-html.png">
```

~~~md
![fake](./code-only-md.png)
~~~

Obsidian-only syntax inside code `![[obsidian-inline.png]]` should be ignored.
