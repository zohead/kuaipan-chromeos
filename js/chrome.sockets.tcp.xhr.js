(function () {
    'use strict';

    var ChromeSocketsXMLHttpRequest = chrome.sockets.tcp.xhr = function () {
        Object.defineProperties(this, {
            options: {
                enumerable: false,
                writable: true,
                value: {
                    uri: null,
                    data: null,
                    events: {},
                    method: null,
                    createInfo: null,
                    inprogress: false,
                    contentlen: -1,
					rawdata: null,
                    redirects: {
                        max: 10,
                        current: 0,
                        last: null
                    },
                    timer: {
                        id: null,
                        recvid: null,
                        expired: false
                    },
                    headers: {
                        'Connection': 'close',
                        'User-Agent': 'chrome.sockets.tcp.xhr'
                    },
                    response: {
                        headers: [],
                        headersText: null
                    }
                }
            },

            props: {
                enumerable: false,
                configurable: false,
                value: {
                    readyState: 0,
                }
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#dom-xmlhttprequest-unsent
             */
            UNSENT: {
                enumerable: false,
                writable: true,
                value: 0
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#dom-xmlhttprequest-opened
             */
            OPENED: {
                enumerable: false,
                writable: true,
                value: 1
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#dom-xmlhttprequest-headers_received
             * TODO: time in milliseconds.
             */
            HEADERS_RECEIVED: {
                enumerable: false,
                writable: true,
                value: 2
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#dom-xmlhttprequest-loading
             * TODO: time in milliseconds.
             */
            LOADING: {
                enumerable: false,
                writable: true,
                value: 3
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#dom-xmlhttprequest-done
             */
            DONE: {
                enumerable: false,
                writable: true,
                value: 4
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
             * TODO: time in milliseconds.
             */
            timeout: {
                enumerable: true,
                writable: true,
                value: 0
            },
            
			recvTimeout: {
				enumerable: true,
				writable: true,
				value: 0
			},

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-withcredentials-attribute
             */
            withCredentials: {
                enumerable: true,
                writable: true,
                value: false
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-upload-attribute
             */
            upload: {
                enumerable: true,
                writable: true,
                value: null
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-status-attribute
             */
            status: {
                enumerable: true,
                writable: true,
                value: 0
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-statustext-attribute
             */
            statusText: {
                enumerable: true,
                writable: true,
                value: null
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-responsetype-attribute
             */
            responseType: {
                enumerable: true,
                writable: true,
                value: 'text'
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-response-attribute
             */
            response: {
                enumerable: true,
                writable: true,
                value: null
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-responsetext-attribute
             */
            responseText: {
                enumerable: true,
                writable: true,
                value: null
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#the-responsexml-attribute
             */
            responseXML: {
                enumerable: true,
                writable: true,
                value: null
            },

            /**
             * http://www.w3.org/TR/XMLHttpRequest/#event-handlers
             */
            onreadystatechange: {
                enumerable: true,
                writable: true,
                value: null
            },

            ontimeout: {
                enumerable: true,
                writable: true,
                value: null
            },

            onabort: {
                enumerable: true,
                writable: true,
                value: null
            },

            onerror: {
                enumerable: true,
                writable: true,
                value: null
            },

            onload: {
                enumerable: true,
                writable: true,
                value: null
            },

            onloadstart: {
                enumerable: true,
                writable: true,
                value: null
            },

            onloadend: {
                enumerable: true,
                writable: true,
                value: null
            },

            onprogress: {
                enumerable: true,
                writable: true,
                value: null
            },

            /**
             * custom event to match `chrome.webRequest.onBeforeRedirect`
             * http://developer.chrome.com/extensions/webRequest#event-onBeforeRedirect
             */
            beforeredirect: {
                enumerable: true,
                writable: true,
                value: null
            },

            readyState: {
                enumerable: true,

                get: function () {
                    return this.props.readyState;
                },

                set: function (value) {
                    this.props.readyState = value;

                    this.dispatchEvent('readystatechange');
                }
            }
        });
    };

    /**
     * Regular Expression for URL validation
     * Modified: added capturing groups
     *
     * Author: Diego Perini
     * Updated: 2010/12/05
     * License: MIT
     *
     * Copyright (c) 2010-2013 Diego Perini (http://www.iport.it)
     *
     * https://gist.github.com/dperini/729294
     */
    ChromeSocketsXMLHttpRequest.prototype.regex = new RegExp(
        '^' +
            // protocol identifier
            '(?:(https?|ftp)://)' +
            // user:pass authentication
            '(?:[^\t\n\r\f\v/\?=]+(?::[^\t\n\r\f\v/\?=]*)?@)?' +
            '(' +
                // IP address exclusion
                // private & local networks
                '(?!(?:10|127)(?:\\.\\d{1,3}){3})' +
                '(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})' +
                '(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})' +
                // IP address dotted notation octets
                // excludes loopback network 0.0.0.0
                // excludes reserved space >= 224.0.0.0
                // excludes network & broacast addresses
                // (first & last IP address of each class)
                '(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])' +
                '(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}' +
                '(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))' +
            '|' +
                // host name
                '(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)' +
                // domain name
                '(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*' +
                // TLD identifier
                '(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))' +
            ')' +
            // port number
            '(?::(\\d{2,5}))?' +
            // resource path
            '(/[^\\s]*)?' +
        '$', 'i'
    );

    /**
     * http://www.w3.org/TR/XMLHttpRequest/#the-open()-method
     */
    ChromeSocketsXMLHttpRequest.prototype.open = function (method, url) {
        this.options.method = method;
        this.options.uri = this.regex.exec(url);

        // check if the method is valid
        if (!this.options.method) {
            throw new TypeError('method is not a valid HTTP method');
        }

        // check if the URI parsed properly
        if (this.options.uri === null) {
            throw new TypeError('url cannot be parsed');
        }

        // catch no path specified error
        if (this.options.uri[4] === undefined) {
            this.options.uri[4] = '/';
        }

        // set readyState to OPENED
        this.readyState = this.OPENED;

        this.setRequestHeader('Host', this.options.uri[2]);
    };

    /**
     * http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader()-method
     */
    ChromeSocketsXMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        if (this.readyState !== this.OPENED || this.options.inprogress === true) {
            throw new TypeError('InvalidStateError');
        }

        if (!header) {
            throw new TypeError('header is not a valid HTTP header field name');
        }

        if (!value && value.length !== 0) {
            throw new TypeError('value is not a valid HTTP header field value.');
        }

        // TODO: If header is in the headers list, append ",", followed by U+0020, followed by value.
        this.options.headers[header] = value;
    };

    /**
     * http://www.w3.org/TR/XMLHttpRequest/#the-send()-method
     */
    ChromeSocketsXMLHttpRequest.prototype.send = function (data) {
        // If the state is not OPENED, throw an "InvalidStateError" exception.
        // If the send() flag is set, throw an "InvalidStateError" exception.
        if (this.readyState !== this.OPENED || this.options.inprogress === true) {
            throw new TypeError('InvalidStateError');
        }

        // If the request method is GET or HEAD, set data to null
        if (['GET', 'HEADER'].indexOf(this.options.method.toUpperCase()) !== -1) {
            data = null;
        }

        // If data is null, do not include a request entity body and go to the next step.
        if (data !== null) {
            var encoding = null;
            var mimetype = null;


            if (data instanceof ArrayBufferView) {
                // Let the request entity body be the raw data represented by data.
            } else if (data instanceof Blob) {
                // if the object's type attribute is not the empty string let mime type be its value.

                // Let the request entity body be the raw data represented by data.
            } else if (data instanceof HTMLElement) {
                // Let encoding be "UTF-8".
                encoding = 'UTF-8';

                // If data is an HTML document, let mime type be "text/html"
                // or let mime type be "application/xml" otherwise.
                mimetype = 'text/html';

                // Then append ";charset=UTF-8" to mime type.
                mimetype += ';charset=UTF-8';

                //Let the request entity body be data, serialized, converted to Unicode, and utf-8 encoded. Re-throw any exception serializing throws.
            } else if (data instanceof FormData) {
                // Let the request entity body be the result of running the multipart/form-data encoding algorithm with data as form data set and with utf-8 as the explicit character encoding.

                //Let mime type be the concatenation of "multipart/form-data;", a U+0020 SPACE character, "boundary=", and the multipart/form-data boundary string generated by the multipart/form-data encoding algorithm.
            } else if (typeof(data) === 'string') {
                // Let encoding be "UTF-8".
                encoding = 'UTF-8';

                // Let mime type be "text/plain;charset=UTF-8".
                mimetype = 'text/plain;charset=UTF-8';

                // Let the request entity body be data, utf-8 encoded.
            }

            this.options.data = data;
        }

        // If a Content-Type header is in author request headers and its value is a valid MIME type that has a charset parameter whose value is not a case-insensitive match for encoding, and encoding is not null, set all the charset parameters of that Content-Type header to encoding.

        // If no Content-Type header is in author request headers and mime type is not null, append a Content-Type header with value mime type to author request headers.

        // Unset the error flag, upload complete flag and upload events flag.

        // If there is no request entity body or if it is empty, set the upload complete flag.

        // Set the send() flag.
        this.options.inprogress = true;

        // Fire a progress event named loadstart.
        this.dispatchEvent('loadstart');

        // continue with sockets setup
        var socketProperties = {
            persistent: false,
            name: 'chrome.sockets.tcp.xhr'
        };

        chrome.sockets.tcp.create(socketProperties, this.onCreate.bind(this));

        if (this.timeout > 0) {
            this.options.timer.id = setTimeout(this.expireTimer.bind(this), this.timeout);
        }
    };

    /**
     * http://www.w3.org/TR/XMLHttpRequest/#the-abort()-method
     */
    ChromeSocketsXMLHttpRequest.prototype.abort = function () {
        this.disconnect();
    };

    /**
     * http://www.w3.org/TR/XMLHttpRequest/#the-getresponseheader()-method
     */
    ChromeSocketsXMLHttpRequest.prototype.getResponseHeader = function (header) {
        return this.options.response.headers[header];
    };

    /**
     * http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders()-method
     */
    ChromeSocketsXMLHttpRequest.prototype.getAllResponseHeaders = function () {
        return this.options.response.headersText;
    };

    /**
     * http://www.w3.org/TR/XMLHttpRequest/#the-overridemimetype()-method
     */
    ChromeSocketsXMLHttpRequest.prototype.overrideMimeType = function (mimetype) {
    };

    /**
     * event managers
     */
    ChromeSocketsXMLHttpRequest.prototype.addEventListener = function (name, callback) {
        if (this.options.events[name]) {
            this.options.events[name].push(callback);
        } else {
            this.options.events[name] = new Array(callback);
        }

        return this;
    };

    ChromeSocketsXMLHttpRequest.prototype.removeEventListener = function(name, callback) {
        if (this.options.events[name]) {
            var i = this.options.events[name].indexOf(callback);
            if (i > -1) {
                this.options.events[name].splice(i, 1);
            } else {
                return false;
            }

            return true;
        } else {
            return false;
        }
    };

    ChromeSocketsXMLHttpRequest.prototype.dispatchEvent = function(name) {
        var args = arguments;

        if (this.hasOwnProperty('on' + name)) {
            if (this['on' + name]) {
                this['on' + name].apply(this, Array.prototype.slice.call(args, 1));
            }
        }

        if (!this.options.events[name]) {
            return false;
        }

        this.options.events[name].forEach(function (event) {
            event.apply(this, Array.prototype.slice.call(args, 1));
        }.bind(this));
    };

    /**
     * chrome.sockets.tcp events
     */
    ChromeSocketsXMLHttpRequest.prototype.onCreate = function (createInfo) {
        if (!this.options.inprogress) {
            return;
        }

        var port = this.options.uri[3] ? parseInt(this.options.uri[3], null) : 80;

        this.options.createInfo = createInfo;

        chrome.sockets.tcp.connect(createInfo.socketId, this.options.uri[2], port, this.onConnect.bind(this));
    };

    ChromeSocketsXMLHttpRequest.prototype.onConnect = function (result) {
        if (!this.options.inprogress) {
            return;
        }

        if (this.options.timer.expired) {
            return;
        } else if (result < 0) {
            this.error({
                error: 'connect error',
                resultCode: result
            });
        } else {
        	chrome.sockets.tcp.onReceiveError.addListener(this.onReceiveError.bind(this));
            // assign recieve listner
            chrome.sockets.tcp.onReceive.addListener(this.onReceive.bind(this));

            // send message as ArrayBuffer
            this.generateMessage().toArrayBuffer(function sendMessage (buffer) {
                chrome.sockets.tcp.send(this.options.createInfo.socketId, buffer, this.onSend.bind(this));
            }.bind(this));
        }
    };

    ChromeSocketsXMLHttpRequest.prototype.onSend = function (sendInfo) {
        if (sendInfo.resultCode < 0) {
            this.error({
                error: 'send error',
                resultCode: sendInfo.resultCode
            });

            this.disconnect();
        } else if (this.recvTimeout > 0) {
			this.options.timer.recvid = setTimeout(this.expireTimer.bind(this), this.recvTimeout);
		}
    };

    ChromeSocketsXMLHttpRequest.prototype.onReceiveError = function (info) {
    	if (this.options.createInfo == null || info.socketId !== this.options.createInfo.socketId) {
            return;
        }
		this.disconnect();
		this.options.rawdata.toString(this.parseResponse.bind(this));
        /*this.error({
            error: 'receive error',
            resultCode: info.resultCode
        });*/
    };

    ChromeSocketsXMLHttpRequest.prototype.onReceive = function (info) {
        if (!this.options.inprogress) {
            return;
        }

        if (this.options.createInfo == null || info.socketId !== this.options.createInfo.socketId) {
            return;
        }

		// clear recv timer after first recv
		if (this.options.timer.recvid != null) {
			clearTimeout(this.options.timer.recvid);
			this.options.timer.recvid = null;
		}

    	if (this.options.rawdata == null)
    		this.options.rawdata = info.data;
    	else {
			var tmp = new Uint8Array(this.options.rawdata.byteLength + info.data.byteLength);
			tmp.set(new Uint8Array(this.options.rawdata), 0);
			tmp.set(new Uint8Array(info.data), this.options.rawdata.byteLength);
			this.options.rawdata = tmp.buffer;
    	}
    };

    /**
     * internal methods
     */
    ChromeSocketsXMLHttpRequest.prototype.parseResponse = function (response) {
        // detect CRLFx2 position
        var responseMatch = response.match(/\r\n\r\n/);

        // something went wrong
        if (responseMatch === null) {
            /*this.error({
                error: 'could not parse response'
            });

            return;*/
            this.options.response.headersText = response;
            this.responseText = "";
        } else {
        	// slice the headers up to CRLFx2
        	this.options.response.headersText = response.slice(0, responseMatch.index);

        	// slice the body right after CRLFx2 and set the response object
        	if (this.responseType == "arraybuffer")
        		this.responseText = this.options.rawdata.slice(responseMatch.index + 4);
        	else
        		this.responseText = response.slice(responseMatch.index + 4);
        }

        // parse headers
        var headerLines = this.options.response.headersText.split('\r\n');
        var statusLine = headerLines.shift();

        var statusLineMatch = statusLine.match(/(HTTP\/\d\.\d)\s+((\d+)\s+.*)/);

        if (statusLineMatch) {
            this.status = parseInt(statusLineMatch[3], 0);
            this.statusText = statusLineMatch[2];
        }

        headerLines.forEach(function (headerLine) {
            // detect CRLFx2 position
            var headerLineMatch = headerLine.match(/:/);

            // sanity check
            if (headerLineMatch) {
                // slice the header line at the colon and trim output
                var header = headerLine.slice(0, headerLineMatch.index).replace(/^\s+/g, '').replace(/\s+$/g, '');
                var value = headerLine.slice(headerLineMatch.index + 1).replace(/^\s+/g, '').replace(/\s+$/g, '');

                this.options.response.headers[header] = value;
            }
        }.bind(this));

		// save content length
		if (this.options.response.headers.hasOwnProperty("Content-Length"))
			this.options.contentlen = this.options.response.headers['Content-Length'];

        this.processResponse();
    };

    ChromeSocketsXMLHttpRequest.prototype.processResponse = function () {

        // If the response has an HTTP status code of 301, 302, 303, 307, or 308
        // TODO: implement infinite loop precautions
        if ([301, 302, 303, 307, 308].indexOf(this.status) !== -1) {
            // stop
            //this.disconnect();

            // set the new destination
            var redirectUrl = this.getResponseHeader('Location');

            // notify
            this.dispatchEvent('beforeredirect', redirectUrl, this.options.response.headers, this.statusText);

            if (this.options.redirects.max <= 0)
            	return;

            // enforece the redirect limit
            if (this.options.redirects.current === this.options.redirects.max) {
                this.error({
                    error: 'max redirects',
                    resultCode: 310
                });

                return;
            }

            // detect a loop
            if (this.options.redirects.last === redirectUrl) {
                this.error({
                    error: 'redirect loop'
                });

                return;
            } else {
                this.options.redirects.last = redirectUrl;
            }

            // count
            this.options.redirects.current++;

			this.options.rawdata = null;
			this.options.contentlen = 0;
            // start a new call
            this.open(this.options.method, redirectUrl);
            // follow cookies
            if (this.options.response.headers.hasOwnProperty("Set-Cookie"))
            	this.setRequestHeader('Cookie', this.options.response.headers["Set-Cookie"]);
            this.send(this.options.data);

            return;
        }

        // set readyState to HEADERS_RECEIVED
        this.readyState = this.HEADERS_RECEIVED;
        // set readyState to LOADING
        this.readyState = this.LOADING;

        // TODO: set the response entity body according to responseType, as an ArrayBuffer, Blob, Document, JavaScript object (for "json"), or string.
        this.response = this.responseText;

        // set readyState to DONE
        this.readyState = this.DONE;

        // Fire a progress event named "progress".
        this.dispatchEvent('progress');

        // Fire a progress event named load.
        this.dispatchEvent('load');

        // Fire a progress event named loadend
        this.dispatchEvent('loadend');
    };

    ChromeSocketsXMLHttpRequest.prototype.generateMessage = function () {
        var headers = [];

        // add missing parts to header
        headers.push(this.options.method + ' ' + this.options.uri[4] + ' HTTP/1.1');

        for (var name in this.options.headers) {
            headers.push(name + ': ' + this.options.headers[name]);
        }

        return headers.join('\r\n') + '\r\n\r\n';
    };

    ChromeSocketsXMLHttpRequest.prototype.error = function (error) {
        // list of network errors as defined in chromium source:
        // https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h&sq=package:chromium
        //
        // Ranges:
        //     0- 99 System related errors
        //   100-199 Connection related errors
        //   200-299 Certificate errors
        //   300-399 HTTP errors
        //   800-899 DNS resolver errors

        var errorCodes = {
            1: 'An asynchronous IO operation is not yet complete.',
            2: 'A generic failure occurred.',
            3: 'An operation was aborted (due to user action)',
            4: 'An argument to the function is incorrect.',
            5: 'The handle or file descriptor is invalid',
            6: 'The file or directory cannot be found',
            7: 'An operation timed out',
            8: 'The file is too large',
            9: 'An unexpected error.  This may be caused by a programming mistake or an invalid assumption',
            10: 'Permission to access a resource, other than the network, was denied',
            11: 'The operation failed because of unimplemented functionality',
            12: 'There were not enough resources to complete the operation',
            13: 'Memory allocation failed',
            14: 'The file upload failed because the file\'s modification time was different from the expectation',
            15: 'The socket is not connected',
            16: 'The file already exists',
            17: 'The path or file name is too long',
            18: 'Not enough room left on the disk',
            19: 'The file has a virus',
            20: 'The client chose to block the request',
            21: 'The network changed',
            22: 'The request was blocked by the URL blacklist configured by the domain administrator',
            23: 'The socket is already connected',
            100: 'A connection was closed (corresponding to a TCP FIN)',
            101: 'A connection was reset (corresponding to a TCP RST)',
            102: 'A connection attempt was refused',
            103: 'A connection timed out as a result of not receiving an ACK for data sent. This can include a FIN packet that did not get ACK\'d',
            104: 'A connection attempt failed',
            105: 'The host name could not be resolved',
            106: 'The Internet connection has been lost',
            107: 'An SSL protocol error occurred',
            108: 'The IP address or port number is invalid (e.g., cannot connect to the IP address 0 or the port 0)',
            109: 'The IP address is unreachable.  This usually means that there is no route to the specified host or network',
            110: 'The server requested a client certificate for SSL client authentication',
            111: 'A tunnel connection through the proxy could not be established',
            112: 'No SSL protocol versions are enabled',
            113: 'The client and server don\'t support a common SSL protocol version or cipher suite',
            114: 'The server requested a renegotiation (rehandshake)',
            115: 'The proxy requested authentication (for tunnel establishment) with an unsupported method',
            116: 'During SSL renegotiation (rehandshake), the server sent a certificate with an error',
            117: 'The SSL handshake failed because of a bad or missing client certificate',
            118: 'A connection attempt timed out',
            119: 'There are too many pending DNS resolves, so a request in the queue was aborted',
            120: 'Failed establishing a connection to the SOCKS proxy server for a target host',
            121: 'The SOCKS proxy server failed establishing connection to the target host because that host is unreachable',
            122: 'The request to negotiate an alternate protocol failed',
            123: 'The peer sent an SSL no_renegotiation alert message',
            124: 'Winsock sometimes reports more data written than passed.  This is probably due to a broken LSP',
            125: 'An SSL peer sent us a fatal decompression_failure alert.',
            126: 'An SSL peer sent us a fatal bad_record_mac alert',
            127: 'The proxy requested authentication (for tunnel establishment)',
            128: 'A known TLS strict server didn\'t offer the renegotiation extension',
            129: 'The SSL server attempted to use a weak ephemeral Diffie-Hellman key',
            130: 'Could not create a connection to the proxy server.',
            131: 'A mandatory proxy configuration could not be used.',
            133: 'We\'ve hit the max socket limit for the socket pool while preconnecting.',
            134: 'The permission to use the SSL client certificate\'s private key was denied',
            135: 'The SSL client certificate has no private key',
            136: 'The certificate presented by the HTTPS Proxy was invalid',
            137: 'An error occurred when trying to do a name resolution (DNS)',
            138: 'Permission to access the network was denied.',
            139: 'The request throttler module cancelled this request to avoid DDOS',
            140: 'A request to create an SSL tunnel connection through the HTTPS proxy received a non-200 (OK) and non-407 (Proxy Auth) response.',
            141: 'We were unable to sign the CertificateVerify data of an SSL client auth handshake with the client certificate\'s private key',
            142: 'The message was too large for the transport',
            143: 'A SPDY session already exists, and should be used instead of this connection',
            145: 'Websocket protocol error.',
            146: 'Connection was aborted for switching to another ptotocol.',
            147: 'Returned when attempting to bind an address that is already in use',
            148: 'An operation failed because the SSL handshake has not completed',
            149: 'SSL peer\'s public key is invalid',
            150: 'The certificate didn\'t match the built-in public key pins for the host name',
            151: 'Server request for client certificate did not contain any types we support',
            152: 'Server requested one type of cert, then requested a different type while the first was still being generated',
            153: 'An SSL peer sent us a fatal decrypt_error alert. ',
            154: 'There are too many pending WebSocketJob instances, so the new job was not pushed to the queue',
            155: 'There are too many active SocketStream instances, so the new connect request was rejected',
            156: 'The SSL server certificate changed in a renegotiation',
            157: 'The SSL server indicated that an unnecessary TLS version fallback was performed',
            158: 'Certificate Transparency: All Signed Certificate Timestamps failed to verify',
            159: 'The SSL server sent us a fatal unrecognized_name alert',
            300: 'The URL is invalid',
            301: 'The scheme of the URL is disallowed',
            302: 'The scheme of the URL is unknown',
            310: 'Attempting to load an URL resulted in too many redirects',
            311: 'Attempting to load an URL resulted in an unsafe redirect (e.g., a redirect to file: is considered unsafe)',
            312: 'Attempting to load an URL with an unsafe port number.',
            320: 'The server\'s response was invalid',
            321: 'Error in chunked transfer encoding',
            322: 'The server did not support the request method',
            323: 'The response was 407 (Proxy Authentication Required), yet we did not send the request to a proxy',
            324: 'The server closed the connection without sending any data',
            325: 'The headers section of the response is too large',
            326: 'The PAC requested by HTTP did not have a valid status code (non-200)',
            327: 'The evaluation of the PAC script failed',
            328: 'The response was 416 (Requested range not satisfiable) and the server cannot satisfy the range requested',
            329: 'The identity used for authentication is invalid',
            330: 'Content decoding of the response body failed',
            331: 'An operation could not be completed because all network IO is suspended',
            332: 'FLIP data received without receiving a SYN_REPLY on the stream',
            333: 'Converting the response to target encoding failed',
            334: 'The server sent an FTP directory listing in a format we do not understand',
            335: 'Attempted use of an unknown SPDY stream id',
            336: 'There are no supported proxies in the provided list',
            337: 'There is a SPDY protocol error',
            338: 'Credentials could not be established during HTTP Authentication',
            339: 'An HTTP Authentication scheme was tried which is not supported on this machine',
            340: 'Detecting the encoding of the response failed',
            341: '(GSSAPI) No Kerberos credentials were available during HTTP Authentication',
            342: 'An unexpected, but documented, SSPI or GSSAPI status code was returned',
            343: 'The environment was not set up correctly for authentication',
            344: 'An undocumented SSPI or GSSAPI status code was returned',
            345: 'The HTTP response was too big to drain',
            346: 'The HTTP response contained multiple distinct Content-Length headers',
            347: 'SPDY Headers have been received, but not all of them - status or version headers are missing, so we\'re expecting additional frames to complete them',
            348: 'No PAC URL configuration could be retrieved from DHCP.',
            349: 'The HTTP response contained multiple Content-Disposition headers',
            350: 'The HTTP response contained multiple Location headers',
            351: 'SPDY server refused the stream. Client should retry. This should never be a user-visible error',
            352: 'SPDY server didn\'t respond to the PING message',
            353: 'The request couldn\'t be completed on an HTTP pipeline. Client should retry',
            354: 'The HTTP response body transferred fewer bytes than were advertised by the Content-Length header when the connection is closed',
            355: 'The HTTP response body is transferred with Chunked-Encoding, but the terminating zero-length chunk was never sent when the connection is closed',
            356: 'There is a QUIC protocol error',
            357: 'The HTTP headers were truncated by an EOF',
            358: 'The QUIC crytpo handshake failed.',
            359: 'An https resource was requested over an insecure QUIC connection',
            501: 'The server\'s response was insecure (e.g. there was a cert error)',
            502: 'The server responded to a <keygen> with a generated client cert that we don\'t have the matching private key for',
            503: 'An error adding to the OS certificate database (e.g. OS X Keychain)',
            800: 'DNS resolver received a malformed response',
            801: 'DNS server requires TCP',
            802: 'DNS server failed.',
            803: 'DNS transaction timed out',
            804: 'The entry was not found in cache, for cache-only lookups',
            805: 'Suffix search list rules prevent resolution of the given host name',
            806: 'Failed to sort addresses according to RFC3484'
        };

        if (this.options.inprogress) {
            this.disconnect();
        }

        if (error.resultCode) {
            error.resultCode = Math.abs(error.resultCode);
            error.message = errorCodes[Math.abs(error.resultCode)];
        }

        this.dispatchEvent('error', error);
    };

    ChromeSocketsXMLHttpRequest.prototype.disconnect = function () {
        this.options.inprogress = false;

		if (this.options.timer.id != null)
			clearTimeout(this.options.timer.id);

        if (this.options.createInfo !== null) {
            chrome.sockets.tcp.disconnect(this.options.createInfo.socketId);
            chrome.sockets.tcp.close(this.options.createInfo.socketId);
            this.options.createInfo = null;
        }
    };

    ChromeSocketsXMLHttpRequest.prototype.expireTimer = function () {
        if (this.readyState === this.OPENED) {
            this.disconnect();
            this.options.timer.expired = true;
            this.error({
                error: 'timed out'
            });

            this.dispatchEvent('timeout');
        }
    };

    ChromeSocketsXMLHttpRequest.prototype.setMaxRedirects = function (max) {
        this.options.redirects.max = max;
    };

    /**
     * internal methods
     * TODO: consider removing from global objects
     */
    ArrayBuffer.prototype.toString = function (callback) {
        var blob = new Blob([this]);
        var reader = new FileReader();

        reader.onload = function (e) {
            callback(e.target.result);
        };

        reader.readAsText(blob);
    };

    String.prototype.toArrayBuffer = function (callback) {
        var blob = new Blob([this]);
        var reader = new FileReader();

        reader.onload = function (e) {
            callback(e.target.result);
        };

        reader.readAsArrayBuffer(blob);
    };
})();
