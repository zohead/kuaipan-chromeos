var k_dlg = $("#faildlg")[0];

function k_alert(msg)
{
	$("#faildesc").html(msg);
	k_dlg.show();
}

function k_alert_msg(title, msg)
{
	k_alert(chrome.i18n.getMessage(title) + (typeof(msg) == "undefined" ? "" : ": " + msg + " !"));
}
