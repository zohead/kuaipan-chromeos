var KP_API_BASE = "https://openapi.kuaipan.cn/";
var KP_API_BASE_HTTP = "http://openapi.kuaipan.cn/";
var KP_WEB_BASE = "https://www.kuaipan.cn/";
var KP_API_CONTENT = "http://api-content.dfs.kuaipan.cn/";
var KP_CONV_BASE = "http://conv.kuaipan.cn/";
var KP_FS_ID = "kuaipanfs";
var KP_API_KEY = "xcfKeHVF519FPegi";
var KP_API_SECRET = "R9u00KWz1nZl94nh";

var KP_CALLBACK_URL = chrome.identity.getRedirectURL("kuaipan");
var KP_REAL_TOKEN = { public: "", secret: "" };

var kp_oauth = OAuth({
	consumer: {
		public: KP_API_KEY,
		secret: KP_API_SECRET
	},
	signature_method: 'HMAC-SHA1'
});

function kp_time(dstr)
{
	var darr = dstr.split(/[\s-:]/);
	if (darr == null || typeof(darr) == "undefined") return null;
	return new Date(Date.UTC(Number(darr[0]), Number(darr[1]) - 1, Number(darr[2]), Number(darr[3]), Number(darr[4]), Number(darr[5])) - 28800000);
}

function __kp_request(url, rdata, token, func)
{
	// request data (padding with "rdata")
	var reqdata = {
		url: url,
		method: 'GET',
		data: rdata
	};

	$.ajax({
		url: reqdata.url,
		dataType: "json",
		type: reqdata.method,
		data: kp_oauth.authorize(reqdata, token)
	}).done(function(ret) {
		var lastError = chrome.runtime.lastError;
		if (lastError != null && typeof(lastError) != "undefined")
			console.log("KuaiPan request error: " + lastError.message);

		var response = { ret: 0, status: 200, data: ret };
		func(response);
	}).fail(function(obj, sts, err) {
		var response = { ret: 1, status: obj.status, text: sts, data: err };
		func(response);
	});
}

function kp_request(url, rdata, token, func)
{
	if (typeof(token.public) != "undefined" && typeof(token.secret) != "undefined" && 
		(token.public.length <= 0 || token.secret.length <= 0)) {
		// get saved token
		chrome.storage.local.get(["real_token", "real_secret"], function(result) {
			var lastError = chrome.runtime.lastError;
			if ((lastError != null && typeof(lastError) != "undefined") || 
				typeof(result.real_token) == "undefined" || typeof(result.real_secret) == "undefined")
				func({ ret: 1, status: 401, text: "error", data: "authorization failed" });
			else {
				token.public = KP_REAL_TOKEN.public = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(result.real_token));
				token.secret = KP_REAL_TOKEN.secret = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(result.real_secret));
				__kp_request(url, rdata, token, func);
			}
		});
	} else
		__kp_request(url, rdata, token, func);
}

function kp_redirect_url(url, rdata, token, func)
{
	// request data (padding with "rdata")
	var reqdata = {
		url: url,
		method: 'GET',
		data: rdata
	};

	// full url for sockets
	var nurl = url + "?" + kp_oauth.getParameterString(reqdata, kp_oauth.authorize(reqdata, token));

	var xhr = new chrome.sockets.tcp.xhr();
	xhr.recvTimeout = 1000;
	xhr.onreadystatechange = function() {	// can't get redirect URL
		if (this.readyState === this.DONE) {
			var response = { ret: 2, status: this.status, data: this.response };
			func(response);
		}
	};
	xhr.onerror = function (error) {
		var response = { ret: 1, status: this.status, data: error.error };
		func(response);
	};
	xhr.addEventListener('beforeredirect', function(redirectUrl, responseHeaders, statusText) {
		var response = { ret: 0, status: 302, data: { url: redirectUrl, headers: responseHeaders } };
		func(response);
	});
	xhr.setMaxRedirects(0);	// don't handle redirect
	xhr.open('GET', nurl);
	xhr.send(null);
}

function __kp_metadata(rpath, iflist, func)
{
	kp_request(KP_API_BASE + '1/metadata/kuaipan' + encodeURIComponent(rpath), { oauth_token: KP_REAL_TOKEN.public, list: iflist }, KP_REAL_TOKEN, func);
}

function kp_stat(rpath, func)
{
	__kp_metadata(rpath, false, func);
}

function kp_readdir(rpath, func)
{
	__kp_metadata(rpath, true, func);
}

function kp_get_thumburl(rpath, func)
{
	kp_redirect_url(KP_API_BASE_HTTP + 'open/thumbnail302', { oauth_token: KP_REAL_TOKEN.public, root: "kuaipan", path: rpath, width: 48, height: 48 }, KP_REAL_TOKEN, func);
}

function kp_get_thumb_datauri(rpath, func)
{
	kp_get_thumburl(rpath, function (response) {
		if (response.ret != 0) {
			func({ ret: response.ret, status: response.status, data: response.data });
			return;
		}
		if (typeof(response.data.url) == "undefined" || response.data.url.length <= 0) {
			func({ ret: 2 });
			return;
		}

		$.ajax({
			url: response.data.url,
			type: "GET",
			dataType: "binary",
			processData: false,
			success: function(result) {
				var fileReader = new FileReader();
				fileReader.onload = function(fileLoadedEvent) {
					func({ ret: 0, data: fileLoadedEvent.target.result });
				}
				fileReader.readAsDataURL(result);
			}
		});
	});
}

function kp_read(rpath, offset, length, func)
{
	kp_redirect_url(KP_API_CONTENT + "1/fileops/download_file", { oauth_token: KP_REAL_TOKEN.public, root: "kuaipan", path: rpath }, KP_REAL_TOKEN, function(response) {
		if (response.ret != 0 || typeof(response.data.url) == "undefined" || response.data.url.length <= 0) {
			console.log("Can't get redirect url for '" + rpath + "'.");
			var response = { ret: 2, status: 400, data: "Redirect error" };
			func(response);
			return;
		}

		var xhr = new chrome.sockets.tcp.xhr();
		xhr.onreadystatechange = function() {
			if (this.readyState === this.DONE) {
				var response = { ret: 0, status: this.status, data: this.response };
				func(response);
			}
		};
		xhr.onerror = function (error) {
			var response = { ret: 1, status: this.status, data: error.error };
			func(response);
		};
		xhr.responseType = "arraybuffer";
		xhr.recvTimeout = 1200;	// timeout for receive first data
		xhr.open('GET', response.data.url);
		// follow cookies
		if (response.data.headers.hasOwnProperty("Set-Cookie"))
			xhr.setRequestHeader("Cookie", response.data.headers["Set-Cookie"]);
		// set HTTP Range if needed
		if (offset >= 0 && length > 0)
			xhr.setRequestHeader("Range", "bytes=" + String(offset) + "-" + String(offset + length - 1));
		xhr.send(null);
	});
}

function __kp_get_para_by_name(url, name)
{
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var tind = url.indexOf('?');
	if (tind >= 0) url = url.substr(tind);
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(url);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function kp_mount(func)
{
	// request temp token first
	kp_request(KP_API_BASE + 'open/requestToken', { oauth_callback: KP_CALLBACK_URL }, {}, function (response) {
		if (response.ret == 0) {
			// we have got temp token here
			var token = {
				public: response.data.oauth_token,
				secret: response.data.oauth_token_secret
			};

			var lastError = chrome.runtime.lastError;
			if (lastError != null && typeof(lastError) != "undefined")
				console.log("KuaiPan mount error: " + lastError.message);

			chrome.identity.launchWebAuthFlow(
				{'url': KP_WEB_BASE + "api.php?ac=open&op=authorise&oauth_token=" + token.public, 'interactive': true},
				function(redirect_url) {
					if (redirect_url == null || typeof(redirect_url) == "undefined" || redirect_url.indexOf(KP_CALLBACK_URL) != 0) {
						var auth_res = { ret: 2, status: 401, text: "error", data: "authorization failed" };
						func(auth_res);
						return;
					}

					// get real token after user grant permission
					kp_request(KP_API_BASE + 'open/accessToken', { oauth_token: token.public, oauth_verifier: __kp_get_para_by_name(redirect_url, "oauth_verifier") }, 
						token, function (real_res) {
							if (real_res.ret == 0) {
									KP_REAL_TOKEN.public = real_res.data.oauth_token;
									KP_REAL_TOKEN.secret = real_res.data.oauth_token_secret;
									// save real token in storage
									chrome.storage.local.set({
										real_token: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(KP_REAL_TOKEN.public)),
										real_secret: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(KP_REAL_TOKEN.secret))}
									);
									func(real_res);
							} else
								func(real_res);
						});;
				}
			);

			lastError = chrome.runtime.lastError;
			if (lastError != null && typeof(lastError) != "undefined")
				console.log("KuaiPan get identity error: " + lastError.message);
        } else
			func(response);
	});

	var lastError = chrome.runtime.lastError;
	if (lastError != null && typeof(lastError) != "undefined")
		console.log("KuaiPan mount error: " + lastError.message);
}

function kp_mkdir(rpath, func)
{
	kp_request(KP_API_BASE + '1/fileops/create_folder', { oauth_token: KP_REAL_TOKEN.public, root: "kuaipan", path: rpath }, KP_REAL_TOKEN, func);
}

/* check whether directory is empty or file exists
 * return values:
 *	0: file exists or directory is empty
 *	1: file or directory doesn't exist
 *	2: directory is not empty
 */
function kp_dir_isempty(rpath, func)
{
	kp_request(KP_API_BASE + '1/metadata/kuaipan' + encodeURIComponent(rpath), { oauth_token: KP_REAL_TOKEN.public, list: true, file_limit: 0 }, KP_REAL_TOKEN, function (response) {
		if (response.ret == 0)
			func({ ret: 0 });
		else if (response.ret == 1 && response.status == 406)
			func({ ret: 2 });
		else
			func({ ret: 1 });
	});
}

function kp_del(rpath, func)
{
	kp_request(KP_API_BASE + '1/fileops/delete', { oauth_token: KP_REAL_TOKEN.public, root: "kuaipan", path: rpath }, KP_REAL_TOKEN, func);
}

function kp_upload(rpath, roverwrite, rdata, func)
{
	kp_request(KP_API_CONTENT + '1/fileops/upload_locate', { oauth_token: KP_REAL_TOKEN.public }, KP_REAL_TOKEN, function (response) {
		if (response.ret != 0) {
			func(response);
			return;
		}
		console.log(response.data.url);

		// get filename
		var pos = rpath.lastIndexOf('/');
		var fname = rpath.substr(pos + 1);

		var reqdata = {
			url: response.data.url + (response.data.url[response.data.url.length - 1] == '/' ? '' : '/') + '1/fileops/upload_file',
			method: 'POST',
			data: { oauth_token: KP_REAL_TOKEN.public, overwrite: roverwrite, root: "kuaipan", path: rpath }
		};
		var nurl = reqdata.url + "?" + kp_oauth.getParameterString(reqdata, kp_oauth.authorize(reqdata, KP_REAL_TOKEN));
		
		var b_data = new FormData();
		// create empty Blob or use passed in File
		if (rdata == null) rdata = new Blob([""], { type: "text/plain"});
		b_data.append("file", rdata, fname);

		$.ajax({
			url: nurl,
			dataType: "json",
			processData: false,		// keep FormData unchanged
			contentType: false,		// auto generate content type for FormData
			type: reqdata.method,
			data: b_data
		}).done(function(ret) {
			var response = { ret: 0, status: 200, data: ret };
			func(response);
		}).fail(function(obj, sts, err) {
			var response = { ret: 1, status: obj.status, text: sts, data: err };
			func(response);
		});
	});
}

function kp_copy(frompath, topath, func)
{
	kp_request(KP_API_BASE + '1/fileops/copy', { oauth_token: KP_REAL_TOKEN.public, root: "kuaipan", from_path: frompath, to_path: topath }, KP_REAL_TOKEN, func);
}

function kp_move(frompath, topath, func)
{
	kp_request(KP_API_BASE + '1/fileops/move', { oauth_token: KP_REAL_TOKEN.public, root: "kuaipan", from_path: frompath, to_path: topath }, KP_REAL_TOKEN, func);
}
