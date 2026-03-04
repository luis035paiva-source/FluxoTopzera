#target photoshop

/**
 * 1) Uses active selection.
 * 2) Copies selected area to a new layer.
 * 3) Fits it inside top zone and centers horizontally.
 * 4) Runs a Photoshop action (Generative).
 * 5) Does NOT save.
 */

(function () {
    var TOP_ZONE_HEIGHT_PX = 400;
    var MIN_TOP_MARGIN_PERCENT = 4; // Minimum margin from top based on document height.
    var CENTER_IN_TOP_ZONE = true;
    var NEW_LAYER_NAME = "HEAD_TOP";

    var RUN_ACTION = true;
    var ACTION_NAME = "Generative";
    var ACTION_SET_NAME = ""; // Leave empty to auto-find the set by action name.

    if (app.documents.length === 0) {
        alert("Abra um documento antes de rodar o script.");
        return;
    }

    var doc = app.activeDocument;
    var originalUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;

    try {
        var selectionBounds;
        try {
            selectionBounds = doc.selection.bounds;
        } catch (e) {
            alert("Faca uma selecao quadrada no canvas antes de rodar o script.");
            return;
        }

        var selLeft = toPx(selectionBounds[0]);
        var selTop = toPx(selectionBounds[1]);
        var selRight = toPx(selectionBounds[2]);
        var selBottom = toPx(selectionBounds[3]);

        if (selRight - selLeft <= 0 || selBottom - selTop <= 0) {
            alert("A selecao esta invalida.");
            return;
        }

        doc.selection.copy();
        doc.paste();

        var layer = doc.activeLayer;
        var layerBounds = layer.bounds;
        var layerW = toPx(layerBounds[2]) - toPx(layerBounds[0]);
        var layerH = toPx(layerBounds[3]) - toPx(layerBounds[1]);
        if (layerW <= 0 || layerH <= 0) {
            alert("Nao foi possivel criar a camada com a selecao.");
            return;
        }

        var docWidth = toPx(doc.width);
        var docHeight = toPx(doc.height);
        var topZone = Math.min(TOP_ZONE_HEIGHT_PX, docHeight);

        if (layerH > topZone) {
            var scale = (topZone / layerH) * 100;
            layer.resize(scale, scale, AnchorPosition.MIDDLECENTER);
        }

        layerBounds = layer.bounds;
        var left = toPx(layerBounds[0]);
        var top = toPx(layerBounds[1]);
        var right = toPx(layerBounds[2]);
        var bottom = toPx(layerBounds[3]);

        var finalW = right - left;
        var finalH = bottom - top;
        var targetLeft = (docWidth - finalW) / 2;
        var targetTop = CENTER_IN_TOP_ZONE ? (topZone - finalH) / 2 : 0;
        var minTopMargin = (docHeight * MIN_TOP_MARGIN_PERCENT) / 100;
        var maxTopInsideZone = topZone - finalH;

        if (maxTopInsideZone < 0) {
            maxTopInsideZone = 0;
        }

        if (targetTop < minTopMargin) {
            targetTop = minTopMargin;
        }
        if (targetTop > maxTopInsideZone) {
            targetTop = maxTopInsideZone;
        }

        layer.translate(targetLeft - left, targetTop - top);
        layer.name = NEW_LAYER_NAME;
        doc.selection.deselect();

        if (RUN_ACTION) {
            runActionByName(ACTION_NAME, ACTION_SET_NAME);
        }

        alert("Processo concluido. Geracao pronta para revisao (sem salvar).");
    } catch (err) {
        alert("Erro ao executar o script: " + err.message);
    } finally {
        app.preferences.rulerUnits = originalUnits;
    }

    function toPx(unitValue) {
        return Number(unitValue.as("px"));
    }

    function runActionByName(actionName, preferredSetName) {
        if (!actionName || actionName === "") {
            return;
        }
        if (preferredSetName && preferredSetName !== "") {
            app.doAction(actionName, preferredSetName);
            return;
        }
        var actionSet = findActionSetByActionName(actionName);
        if (!actionSet) {
            throw new Error("Action '" + actionName + "' nao encontrada em nenhum set.");
        }
        app.doAction(actionName, actionSet);
    }

    function findActionSetByActionName(actionName) {
        var i = 1;
        while (true) {
            try {
                var setName = getActionSetNameByIndex(i);
                if (setContainsAction(setName, actionName)) {
                    return setName;
                }
                i++;
            } catch (e) {
                break;
            }
        }
        return null;
    }

    function getActionSetNameByIndex(index) {
        var ref = new ActionReference();
        ref.putIndex(charIDToTypeID("ASet"), index);
        var desc = executeActionGet(ref);
        return desc.getString(charIDToTypeID("Nm  "));
    }

    function setContainsAction(setName, actionName) {
        var actionCount = getActionCountInSet(setName);
        var i;
        for (i = 1; i <= actionCount; i++) {
            if (getActionNameByIndex(setName, i) === actionName) {
                return true;
            }
        }
        return false;
    }

    function getActionCountInSet(setName) {
        var ref = new ActionReference();
        ref.putName(charIDToTypeID("ASet"), setName);
        var desc = executeActionGet(ref);
        return desc.getInteger(charIDToTypeID("NmbC"));
    }

    function getActionNameByIndex(setName, actionIndex) {
        var ref = new ActionReference();
        ref.putIndex(charIDToTypeID("Actn"), actionIndex);
        ref.putName(charIDToTypeID("ASet"), setName);
        var desc = executeActionGet(ref);
        return desc.getString(charIDToTypeID("Nm  "));
    }
})();
