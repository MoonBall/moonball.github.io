1. 用 a 标签下载。

```
const a = document.createElement('a');
a.href = url;
a.download = fileName;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

2. iframe 下载，阿里云 OSS 使用方式。
