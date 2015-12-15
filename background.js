function openWindow()
{
	chrome.app.window.create('view.html', {
		'id': 'kuaipan_main_window',
		'frame': { color: "#b9d5b1" },
		'innerBounds': {
			'minWidth': 480,
			'minHeight': 240,
			'maxWidth': 480,
			'maxHeight': 240
		},
		'resizable': false
	});
}

chrome.app.runtime.onLaunched.addListener(function() {
	openWindow();
});

chrome.runtime.onSuspend.addListener(function() {
});

window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

var __KP_OPEN_FILES = {}, __KP_CACHE_METAS = {};

function fail_err(response, callback)
{
	var serr = "FAILED";
	if (response.status == 404)
		serr = "NOT_FOUND";
	else if (response.status == 403)
		serr = "ACCESS_DENIED";
	callback(serr);
}

function fail_upload_err(response, callback)
{
	var serr = "FAILED";
	if (response.status == 403 || response.status == 405)
		serr = "EXISTS";
	else if (response.status == 404)
		serr = "NOT_FOUND";
	else if (response.status == 413)
		serr = "ABORT";
	else if (response.status == 507)
		serr = "NO_SPACE";
	callback(serr);
}

if (chrome.fileSystemProvider.onMountRequested) {
	chrome.fileSystemProvider.onMountRequested.addListener(function (successCallback, errorCallback) {
		openWindow();
		successCallback();
	});
}

chrome.fileSystemProvider.onUnmountRequested.addListener(function (options, successCallback, errorCallback) {
	chrome.fileSystemProvider.unmount( {fileSystemId: KP_FS_ID }, function () {
		chrome.storage.local.remove(["real_token", "real_secret"]);
		successCallback();
	});
});

chrome.fileSystemProvider.onGetMetadataRequested.addListener(function (options, successCallback, errorCallback) {
	if (options.entryPath == "/") {
		successCallback({ isDirectory: true, name: "", size: 0, modificationTime: new Date() });
		return;
	}

	var data = null;
	// try to get metadata from cache (last for 3 seconds, reduce requests to KuaiPan server)
	if (__KP_CACHE_METAS.hasOwnProperty(options.entryPath) && new Date().getTime() - __KP_CACHE_METAS[options.entryPath].lasttm < 3000) {
		data = {
			isDirectory: __KP_CACHE_METAS[options.entryPath].isDirectory,
			name: __KP_CACHE_METAS[options.entryPath].name,
			size: __KP_CACHE_METAS[options.entryPath].size,
			modificationTime: __KP_CACHE_METAS[options.entryPath].modificationTime
		};

		if (options.thumbnail) {	// need to get thumbnail
			if (typeof(__KP_CACHE_METAS[options.entryPath].thumbnail) == "undefined") {
				kp_get_thumb_datauri(options.entryPath, function (tbres) {
					if (tbres.ret == 0 && tbres.data.length > 0)
						__KP_CACHE_METAS[options.entryPath].thumbnail = data.thumbnail = tbres.data;
					successCallback(data);
				});
			} else {
				data.thumbnail = __KP_CACHE_METAS[options.entryPath].thumbnail;
				successCallback(data);
			}
		} else
			successCallback(data);
	} else {
		kp_stat(options.entryPath, function (response) {
			if (response.ret == 0) {
				if (!__KP_CACHE_METAS.hasOwnProperty(options.entryPath))
					__KP_CACHE_METAS[options.entryPath] = {};

				data = {};
				__KP_CACHE_METAS[options.entryPath].isDirectory = data.isDirectory = (response.data.type == "folder");
				__KP_CACHE_METAS[options.entryPath].name = data.name = response.data.name;
				__KP_CACHE_METAS[options.entryPath].size = data.size = response.data.size;
				__KP_CACHE_METAS[options.entryPath].modificationTime = data.modificationTime = kp_time(response.data.modify_time);
				__KP_CACHE_METAS[options.entryPath].lasttm = new Date().getTime();

				if (options.thumbnail) {	// need to get thumbnail
					kp_get_thumb_datauri(options.entryPath, function (tbres) {
						if (tbres.ret == 0 && tbres.data.length > 0)
							__KP_CACHE_METAS[options.entryPath].thumbnail = data.thumbnail = tbres.data;
						successCallback(data);
					});
				} else
					successCallback(data);
			} else {
				console.log("Get metadata of '" + options.entryPath + "' failed: " + response.data);
				fail_err(response, errorCallback);
			}
		});
	}
});

chrome.fileSystemProvider.onReadDirectoryRequested.addListener(function (options, successCallback, errorCallback) {
	kp_readdir(options.directoryPath, function (response) {
		if (response.ret == 0) {
			if (options.directoryPath != "/" && response.data.type != "folder")
				errorCallback("NOT_A_DIRECTORY");
			else {
				var datas = [];
				for (var i = 0; i < response.data.files.length; i++) {
					var fPath = options.directoryPath + (options.directoryPath.charAt(options.directoryPath.length - 1) == '/' ? '' : '/') + response.data.files[i].name;

					if (!__KP_CACHE_METAS.hasOwnProperty(fPath))
						__KP_CACHE_METAS[fPath] = {};

					var data = {};
					// save to cache in readdir, reduce requests
					__KP_CACHE_METAS[fPath].isDirectory = data.isDirectory = (response.data.files[i].type == "folder");
					__KP_CACHE_METAS[fPath].name = data.name = response.data.files[i].name;
					__KP_CACHE_METAS[fPath].size = data.size = response.data.files[i].size;
					__KP_CACHE_METAS[fPath].modificationTime = data.modificationTime = kp_time(response.data.files[i].modify_time);
					__KP_CACHE_METAS[fPath].lasttm = new Date().getTime();

					datas.push(data);
				}
				successCallback(datas, false);
			}
		} else
			fail_err(response, errorCallback);
	});
});

chrome.fileSystemProvider.onOpenFileRequested.addListener(function (options, successCallback, errorCallback) {
	kp_stat(options.filePath, function (response) {
		if (response.ret == 0) {
			if (response.data.type == "folder")
				errorCallback("NOT_A_FILE");
			else {
				if (!__KP_CACHE_METAS.hasOwnProperty(options.filePath))
					__KP_CACHE_METAS[options.filePath] = {};

				__KP_CACHE_METAS[options.filePath].isDirectory = (response.data.type == "folder");
				__KP_CACHE_METAS[options.filePath].name = response.data.name;
				__KP_CACHE_METAS[options.filePath].size = response.data.size;
				__KP_CACHE_METAS[options.filePath].modificationTime = kp_time(response.data.modify_time);
				__KP_CACHE_METAS[options.filePath].lasttm = new Date().getTime();

				// save file values with request ID
				__KP_OPEN_FILES[options.requestId] = {
					path: options.filePath,
					filesize: response.data.size,
					inuse: 0,
					failcnt : 0,
					tmpfentry: null,
					tmpfwriter: null,
					write: (options.mode == "WRITE")
				};
				successCallback();
			}
		} else
			fail_err(response, errorCallback);
	});
});

chrome.fileSystemProvider.onCloseFileRequested.addListener(function (options, successCallback, errorCallback) {
	if (__KP_OPEN_FILES.hasOwnProperty(options.openRequestId)) {
		if (__KP_OPEN_FILES[options.openRequestId].inuse) {
			errorCallback("IN_USE");
			return;
		} else {
			// commit temporary file to server
			if (__KP_OPEN_FILES[options.openRequestId].write && __KP_OPEN_FILES[options.openRequestId].tmpfwriter != null) {
				console.log("Read upload temp file of: " + __KP_OPEN_FILES[options.openRequestId].path);
				__KP_OPEN_FILES[options.openRequestId].tmpfentry.file(function (rfile) {
					kp_upload(__KP_OPEN_FILES[options.openRequestId].path, true, rfile, function (response) {
						__KP_OPEN_FILES[options.openRequestId].tmpfentry.remove(function() {}, function (e) {});
						delete __KP_OPEN_FILES[options.openRequestId];
						if (response.ret == 0)
							successCallback();
						else
							errorCallback("FAILED");
					});
				}, function (e) {
					__KP_OPEN_FILES[options.openRequestId].tmpfentry.remove(function() {}, function (e) {});
					delete __KP_OPEN_FILES[options.openRequestId];
					errorCallback("FAILED");
				});
			} else {
				delete __KP_OPEN_FILES[options.openRequestId];
				successCallback();
			}
		}
	} else
		successCallback();
});

function __kuaipan_read(reqid, offset, length, successCallback, errorCallback)
{
	kp_read(__KP_OPEN_FILES[reqid].path, offset, length, function (response) {
		if (!__KP_OPEN_FILES.hasOwnProperty(reqid)) {
			var lastError = chrome.runtime.lastError;
			if (lastError != null && typeof(lastError) != "undefined")
				console.log("KuaiPan invalid read request: " + lastError.message);

			errorCallback("FAILED");
		} else {
			__KP_OPEN_FILES[reqid].inuse = 0;
			if (response.ret == 0) {
				var lastError = chrome.runtime.lastError;
				if (lastError != null && typeof(lastError) != "undefined")
					console.log("KuaiPan temp read: " + lastError.message);

				successCallback(response.data, false);
			} else {
				console.log("Fail to read '" + __KP_OPEN_FILES[reqid].path + "', offset: " + offset + ", length: " + length + " after " + __KP_OPEN_FILES[reqid].failcnt + " tries.");
				// retry maximum 12 times for one request or fail
				if (__KP_OPEN_FILES[reqid].failcnt >= 12)
					errorCallback("FAILED");
				else
					__kuaipan_read(reqid, offset, length, successCallback, errorCallback);
				__KP_OPEN_FILES[reqid].failcnt++;
			}
		}
	});
}

chrome.fileSystemProvider.onReadFileRequested.addListener(function (options, successCallback, errorCallback) {
	if (!__KP_OPEN_FILES.hasOwnProperty(options.openRequestId) || __KP_OPEN_FILES[options.openRequestId].write) {
		errorCallback("INVALID_OPERATION");
		return;
	}

	// we need to make sure not exceed file size, otherwise KuaiPan returns invalid data
	var r_len = options.length;
	if (options.offset + options.length > __KP_OPEN_FILES[options.openRequestId].filesize)
		r_len = __KP_OPEN_FILES[options.openRequestId].filesize - options.offset;

	if (r_len <= 0) {	// reach the end
		errorCallback("OK");
		return;
	}

	__KP_OPEN_FILES[options.openRequestId].inuse = 1;
	__kuaipan_read(options.openRequestId, options.offset, r_len, successCallback, errorCallback);
});

chrome.fileSystemProvider.onCreateDirectoryRequested.addListener(function (options, successCallback, errorCallback) {
	kp_stat(options.directoryPath, function (response) {
		if (response.ret == 0)
			errorCallback("EXISTS");
		else {
			kp_mkdir(options.directoryPath, function (response) {
				if (response.ret == 0)
					successCallback();
				else
					errorCallback("FAILED");
			});
		}
	});
});

chrome.fileSystemProvider.onDeleteEntryRequested.addListener(function (options, successCallback, errorCallback) {
	kp_dir_isempty(options.entryPath, function (response) {
		if (response.ret == 1)	// entry doesn't exist, no need to delete
			successCallback();
		else if (!options.recursive && response.ret == 2)
			errorCallback("NOT_EMPTY");
		else {
			kp_del(options.entryPath, function (response) {
				if (response.ret == 0) {
					if (__KP_CACHE_METAS.hasOwnProperty(options.entryPath))
						delete __KP_CACHE_METAS[options.entryPath];
					successCallback();
				} else
					errorCallback("FAILED");
			});
		}
	});
});

function __kuaipan_create(rpath, createfailcnt, successCallback, errorCallback)
{
	// try create file for incase buggy KuaiPan server error
	kp_upload(rpath, false, null, function (upres) {
		if (upres.ret == 0)
			successCallback();
		else if (createfailcnt >= 0)
			fail_upload_err(upres, errorCallback);
		else
			__kuaipan_create(rpath, ++createfailcnt, successCallback, errorCallback);
	});
}

chrome.fileSystemProvider.onCreateFileRequested.addListener(function (options, successCallback, errorCallback) {
	kp_stat(options.filePath, function (response) {
		if (response.ret == 0)
			errorCallback("EXISTS");
		else
			__kuaipan_create(options.filePath, 0, successCallback, errorCallback);
	});
});

function __kuaipan_write_tmp(reqid, offset, data, successCallback, errorCallback)
{
	__KP_OPEN_FILES[reqid].inuse = 1;
	__KP_OPEN_FILES[reqid].tmpfwriter.onwriteend = function(e) {
		// update file size for metadata cache
		if (__KP_CACHE_METAS.hasOwnProperty(__KP_OPEN_FILES[reqid].path)) {
			if (__KP_CACHE_METAS[__KP_OPEN_FILES[reqid].path].size < (offset + data.byteLength))
				__KP_CACHE_METAS[__KP_OPEN_FILES[reqid].path].size = offset + data.byteLength;
			__KP_CACHE_METAS[__KP_OPEN_FILES[reqid].path].lasttm = new Date().getTime();
		}

		__KP_OPEN_FILES[reqid].inuse = 0;
		successCallback();
	};
	__KP_OPEN_FILES[reqid].tmpfwriter.onerror = function(e) {
		__KP_OPEN_FILES[reqid].inuse = 0;
		errorCallback("FAILED");
	};

	__KP_OPEN_FILES[reqid].tmpfwriter.seek(offset);
	__KP_OPEN_FILES[reqid].tmpfwriter.write(new Blob([data]));
}

chrome.fileSystemProvider.onWriteFileRequested.addListener(function (options, successCallback, errorCallback) {
	if (!__KP_OPEN_FILES.hasOwnProperty(options.openRequestId) || !__KP_OPEN_FILES[options.openRequestId].write) {
		errorCallback("INVALID_OPERATION");
		return;
	}

	// request temporary file for write
	if (__KP_OPEN_FILES[options.openRequestId].tmpfwriter == null) {
		if (options.offset != 0) {
			console.log("Write file from offset " + String(options.offset) + " is unsupported by now.");
			errorCallback("FAILED");
			return;
		}

		window.requestFileSystem(window.TEMPORARY, 300*1024*1024, function (fs) {
			var tmpfile = '.kpupload-tmp-' + options.openRequestId;
			fs.root.getFile(tmpfile, {create: true}, function(fileEntry) {
				console.log("Create KuaiPan temp upload file: " + fileEntry.fullPath);
				fileEntry.createWriter(function(fileWriter) {
					__KP_OPEN_FILES[options.openRequestId].tmpfwriter = fileWriter;
					__KP_OPEN_FILES[options.openRequestId].tmpfentry = fileEntry;
					__kuaipan_write_tmp(options.openRequestId, options.offset, options.data, successCallback, errorCallback);
				}, function (e) {
					fileEntry.remove(function() {
						errorCallback("IO");
					}, function (e) {
						errorCallback("IO");
					});
				});
			}, function (e) {
				errorCallback("IO");
			});
		}, function (e) {
			errorCallback("IO");
		});
	} else
		__kuaipan_write_tmp(options.openRequestId, options.offset, options.data, successCallback, errorCallback);
});

chrome.fileSystemProvider.onCopyEntryRequested.addListener(function (options, successCallback, errorCallback) {
	kp_copy(options.sourcePath, options.targetPath, function (response) {
		if (response.ret == 0)
			successCallback();
		else
			errorCallback("FAILED");
	});
});

chrome.fileSystemProvider.onMoveEntryRequested.addListener(function (options, successCallback, errorCallback) {
	kp_move(options.sourcePath, options.targetPath, function (response) {
		if (response.ret == 0) {
			if (__KP_CACHE_METAS.hasOwnProperty(options.sourcePath))
				delete __KP_CACHE_METAS[options.sourcePath];
			successCallback();
		} else
			errorCallback("FAILED");
	});
});

chrome.fileSystemProvider.onTruncateRequested.addListener(function (options, successCallback, errorCallback) {
	if (options.length != 0) {	// only support truncate to 0 bytes for now
		console.log("Truncate file to " + String(options.length) + " bytes is unsupported by now.");
		errorCallback("FAILED");
		return;
	}
	kp_upload(options.filePath, true, null, function (upres) {
		if (upres.ret == 0) {
			if (__KP_CACHE_METAS.hasOwnProperty(options.filePath))
				__KP_CACHE_METAS[options.filePath].size = options.length;
			successCallback();
		} else
			fail_upload_err(upres, errorCallback);
	});
});
