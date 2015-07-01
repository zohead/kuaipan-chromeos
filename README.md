# KuaiPan filesystem for Chrome OS #

Install from Google Chrome Web Store:

<https://chrome.google.com/webstore/detail/kkjodkkaeoeogphajdfbgcbmohpkemjd>

## Introduction ##

This *KuaiPan filesystem for Chrome OS* Google Chrome App provides you ability to mount KuaiPan cloud storage (mainly used in China, now owned by Thunder Networks, used to be owned by KingSoft Cloud).

You can view/add/edit/delete files/directories in all Chrome OS App after mounting KuaiPan storage on Chromebook.

## Limits ##

* Works only on Chrome OS.
* Upload file size limit to 300MB (API limit).
* Doesn't support write from positive offset or truncate file to positive length (API limit).
* File is uploaded during file close operation (API limit, should consume some time if you upload large file, timeout notification may be showed, just ignore it).
* Folders shared by other user are not showed in file list.

**This app stores all your files only via KuaiPan API in <http://www.kuaipan.cn/>, none of your files/email/password is saved in other server.**

## 介绍 ##

此*快盘文件系统* Google Chrome App 支持在 Chrome OS 下挂载快盘免费云存储 (主要在中国使用，原金山快盘，现被迅雷收购)。

在 Chromebook 上挂载完成之后支持在任何 Chrome OS App 中做列举文件夹、创建、上传下载文件等操作。

## 限制 ##

* 只支持 Chrome OS 系统 (Chromebook 等).
* 最大支持上传 300MB 的文件 (API限制).
* 不支持从非 0 的位置写文件或者将文件 truncate 为非 0 大小 (API限制).
* 由于快盘 API 限制，写文件操作在关闭文件时进行，如果文件比较大会在关闭时花费较多的时间，Chrome OS 可能会报超时，这个时候不用管超时通知，上传完成后就没有影响了.
* 与其它快盘账户协作的文件夹由于 API 限制未列在文件列表中.

**此 App 仅通过快盘 API 将您的文件保存在 <http://www.kuaipan.cn/> 上, 您的文件、邮箱、密码等任何信息都不会被第三方服务器保存.**
