var agreed = false;

$(document).ready(function () {
    $('#vimeo-okay-btn').click(function () {
        $('#vimeo-notes-modal').modal('hide');
    });

    //Send a message to background.js that we need to clean up
    $('#vimeo-notes-modal').on('hidden.bs.modal', function (e) {
        console.log(e);
        console.log('Hide button pressed');
        //
        chrome.runtime.sendMessage({
            type: 'modalClosed',
        });
    });

    $('#vimeo-notes-modal').modal('show');
});
