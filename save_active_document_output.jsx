#target photoshop

/**
 * Save the active document as JPEG copy into output folder.
 * Use after reviewing generated versions.
 */

(function () {
    var OUTPUT_FOLDER_PATH = "C:/PythonPhotoshop/output";
    var JPEG_QUALITY = 10; // 0-12

    if (app.documents.length === 0) {
        alert("Abra um documento antes de rodar o script.");
        return;
    }

    var doc = app.activeDocument;

    try {
        var outFolder = new Folder(OUTPUT_FOLDER_PATH);
        if (!outFolder.exists) {
            outFolder.create();
        }

        var baseName = stripExtension(doc.name);
        var fileName = baseName + "_final_" + timestampForFile() + ".jpg";
        var outFile = new File(outFolder.fsName + "/" + fileName);

        var jpgOptions = new JPEGSaveOptions();
        jpgOptions.quality = JPEG_QUALITY;
        jpgOptions.embedColorProfile = true;
        jpgOptions.formatOptions = FormatOptions.STANDARDBASELINE;
        jpgOptions.matte = MatteType.NONE;

        doc.saveAs(outFile, jpgOptions, true, Extension.LOWERCASE);
        alert("Arquivo salvo em:\n" + outFile.fsName);
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }

    function stripExtension(fileName) {
        return fileName.replace(/\.[^\.]+$/, "");
    }

    function timestampForFile() {
        var d = new Date();
        var y = d.getFullYear();
        var m = pad2(d.getMonth() + 1);
        var day = pad2(d.getDate());
        var h = pad2(d.getHours());
        var min = pad2(d.getMinutes());
        var s = pad2(d.getSeconds());
        return y + m + day + "_" + h + min + s;
    }

    function pad2(value) {
        return value < 10 ? "0" + value : String(value);
    }
})();
