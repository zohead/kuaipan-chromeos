function check_mount()
{
	// check whether already mounted
	chrome.fileSystemProvider.getAll(function(fileSystems) {
		var mounted = false;
		for (var i = 0; i < fileSystems.length; i++) {
			if (fileSystems[i].fileSystemId === KP_FS_ID) {
				mounted = true;
				break;
			}
		}
		$("#mount_btn").attr("disabled", mounted);
		$("#umount_btn").attr("disabled", !mounted);
	});
}

function umount_kuaipan()
{
	$("#umount_btn").attr("disabled", true);
	chrome.fileSystemProvider.unmount( {fileSystemId: KP_FS_ID }, function () {
		var lastError = chrome.runtime.lastError;
		if (lastError) {
			k_alert(lastError);
			$("#umount_btn").attr("disabled", false);
		} else {
			chrome.storage.local.remove(["real_token", "real_secret"]);
			$("#mount_btn").attr("disabled", false);
		}
	})
}

function __mount_kuaipan()
{
	chrome.fileSystemProvider.mount( {fileSystemId: KP_FS_ID, displayName: chrome.i18n.getMessage("kuaipan_short_name"), writable: true }, function () {
		var lastError = chrome.runtime.lastError;
		if (lastError) {
			k_alert(lastError);
			$("#mount_btn").attr("disabled", false);
		} else {
			$("#umount_btn").attr("disabled", false);

			window.setTimeout(function() {
				window.close();
			}, 2000);
		}
	});
}

function mount_kuaipan()
{
	$("#mount_btn").attr("disabled", true);
	kp_mount(function (response) {
		if (response.ret == 0)
			__mount_kuaipan();
		else {
			$("#mount_btn").attr("disabled", false);
			k_alert_msg("kuaipan_logfail", response.data);
		}
	});
}

window.addEventListener('DOMContentLoaded', function() {
	var manifest = chrome.runtime.getManifest();

	$("#mount_btn").html(chrome.i18n.getMessage("kuaipan_mount"));
	$("#umount_btn").html(chrome.i18n.getMessage("kuaipan_umount"));
	$("#regkplink").html(chrome.i18n.getMessage("kuaipan_reg"));
	$("#kpinfolbl").html("* " + manifest.name + " v" + manifest.version + " by <a href='http://zohead.com/' target='_blank'>" + manifest.author + "</a> *");

	$("#mount_btn").click(mount_kuaipan);
	$("#umount_btn").click(umount_kuaipan);

	$("#closedlg").click(function() {
		k_dlg.close();
	});

	check_mount();
});

// check platform
chrome.runtime.getPlatformInfo(function(info) {
	if (info.os != "cros") {
		$("#closedlg").hide();
		k_alert_msg("kuaipan_onlycros");
	}
});

// disable right-click
document.addEventListener("contextmenu",  function(e) {
	//e.preventDefault();
});
