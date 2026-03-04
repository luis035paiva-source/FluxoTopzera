#target photoshop

/**
 * Queue importer:
 * 1) Reads next image from INPUT folder.
 * 2) Moves file to PROCESSING folder to avoid duplicates.
 * 3) Opens image and duplicates it into current active document (template).
 * 4) Closes source file without changes.
 */

(function () {
    var BASE_PATH = "C:/PythonPhotoshop";
    var INPUT_FOLDER_PATH = BASE_PATH + "/input";
    var PROCESSING_FOLDER_PATH = INPUT_FOLDER_PATH + "/_processing";

    var SUPPORTED_EXTENSIONS = {
        jpg: true,
        jpeg: true,
        png: true,
        tif: true,
        tiff: true,
        psd: true,
        psb: true
    };

    if (app.documents.length === 0) {
        alert("Abra o template antes de importar a proxima imagem.");
        return;
    }

    var targetDoc = app.activeDocument;
    var originalRulerUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;

    try {
        var inputFolder = new Folder(INPUT_FOLDER_PATH);
        var processingFolder = new Folder(PROCESSING_FOLDER_PATH);

        if (!inputFolder.exists) {
            inputFolder.create();
            alert("Pasta criada em:\n" + inputFolder.fsName + "\n\nColoque as imagens e rode novamente.");
            return;
        }

        if (!processingFolder.exists) {
            processingFolder.create();
        }

        var queue = listInputImages(inputFolder);
        if (queue.length === 0) {
            alert("Nenhuma imagem encontrada em:\n" + inputFolder.fsName);
            return;
        }

        queue.sort(sortByName);

        var sourceFile = queue[0];
        var movedFile = moveFileToProcessing(sourceFile, processingFolder);

        if (!movedFile || !movedFile.exists) {
            throw new Error("Falha ao mover arquivo para _processing.");
        }

        var sourceDoc = app.open(movedFile);
        sourceDoc.activeLayer.duplicate(targetDoc, ElementPlacement.PLACEATBEGINNING);
        app.activeDocument = targetDoc;
        var importedLayer = targetDoc.activeLayer;
        importedLayer.name = "INPUT_" + stripExtension(movedFile.name);
        sourceDoc.close(SaveOptions.DONOTSAVECHANGES);

        app.activeDocument = targetDoc;
        var remaining = queue.length - 1;
        alert(
            "Imagem importada: " + movedFile.name +
            "\nCamada: " + importedLayer.name +
            "\nRestantes na fila: " + remaining
        );
    } catch (err) {
        alert("Erro ao importar: " + err.message);
    } finally {
        app.preferences.rulerUnits = originalRulerUnits;
    }

    function listInputImages(folder) {
        var files = folder.getFiles(function (entry) {
            if (!(entry instanceof File)) {
                return false;
            }
            var ext = getExtension(entry.name).toLowerCase();
            return !!SUPPORTED_EXTENSIONS[ext];
        });
        return files;
    }

    function moveFileToProcessing(file, processingFolder) {
        var target = new File(processingFolder.fsName + "/" + file.name);
        if (target.exists) {
            target = uniqueFileInFolder(processingFolder, file.name);
        }
        var copied = file.copy(target.fsName);
        if (!copied) {
            return null;
        }
        if (!file.remove()) {
            try {
                target.remove();
            } catch (e) {}
            return null;
        }
        return target;
    }

    function uniqueFileInFolder(folder, originalName) {
        var base = stripExtension(originalName);
        var ext = getExtension(originalName);
        var count = 1;
        var candidate = new File(folder.fsName + "/" + originalName);
        while (candidate.exists) {
            candidate = new File(folder.fsName + "/" + withSuffix(base, ext, count));
            count++;
        }
        return candidate;
    }

    function getExtension(fileName) {
        var dotIndex = fileName.lastIndexOf(".");
        if (dotIndex < 0) {
            return "";
        }
        return fileName.substring(dotIndex + 1);
    }

    function stripExtension(fileName) {
        return fileName.replace(/\.[^\.]+$/, "");
    }

    function withSuffix(base, ext, suffix) {
        if (!ext || ext === "") {
            return base + "_" + suffix;
        }
        return base + "_" + suffix + "." + ext;
    }

    function sortByName(a, b) {
        var aName = a.name.toLowerCase();
        var bName = b.name.toLowerCase();
        if (aName < bName) {
            return -1;
        }
        if (aName > bName) {
            return 1;
        }
        return 0;
    }
})();
