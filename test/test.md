---
title: fixture
---

# Relative paths

These are valid refs. If the resolved file is outside source, it will be skipped later.

![cover](cover.jpg)
<img src="./images/demo.webp" alt="demo">
![parent relative](../shared/parent-cover.png)
<img src="../shared/parent-html.png" alt="parent relative html">

This one is also real: ![real](./real-inline-context.png)

# Absolute paths

Only site-root absolute paths like `/images/demo.png` are supported here.

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

<img src="https://example.com/remote-html.png" alt="remote html">
<img src="//cdn.example.com/demo-html.png" alt="protocol relative html">
<img src="data:image/png;base64,BBBB" alt="data html">

# Code blocks and inline code

Inline HTML `<img src="./inline-html.png">` should be ignored.

Inline Markdown `![fake](./inline-md.png)` should be ignored.

```html
<img src="./code-only-html.png">
```

~~~md
![fake](./code-only-md.png)
~~~
