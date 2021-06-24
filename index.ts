import {AllKnownLayouts} from "./Customizations/AllKnownLayouts";
import {FixedUiElement} from "./UI/Base/FixedUiElement";
import {InitUiElements} from "./InitUiElements";
import {QueryParameters} from "./Logic/Web/QueryParameters";
import {UIEventSource} from "./Logic/UIEventSource";
import * as $ from "jquery";
import LayoutConfig from "./Customizations/JSON/LayoutConfig";
import MoreScreen from "./UI/BigComponents/MoreScreen";
import State from "./State";
import Combine from "./UI/Base/Combine";
import Translations from "./UI/i18n/Translations";


import CountryCoder from "latlon2country"

import SimpleMetaTagger from "./Logic/SimpleMetaTagger";
import Minimap from "./UI/Base/Minimap";
import DirectionInput from "./UI/Input/DirectionInput";
import SpecialVisualizations from "./UI/SpecialVisualizations";
import ShowDataLayer from "./UI/ShowDataLayer";
import * as L from "leaflet";

// Workaround for a stupid crash: inject some functions which would give stupid circular dependencies or crash the other nodejs scripts
SimpleMetaTagger.coder = new CountryCoder("https://pietervdvn.github.io/latlon2country/");
DirectionInput.constructMinimap = options =>  new Minimap(options)
SpecialVisualizations.constructMiniMap = options => new Minimap(options)
SpecialVisualizations.constructShowDataLayer = (features: UIEventSource<{ feature: any, freshness: Date }[]>,
                                                 leafletMap: UIEventSource<L.Map>,
                                                 layoutToUse: UIEventSource<LayoutConfig>,
                                                 enablePopups = true,
                                                 zoomToFeatures = false) => new ShowDataLayer(features, leafletMap, layoutToUse, enablePopups, zoomToFeatures)

let defaultLayout = ""
// --------------------- Special actions based on the parameters -----------------
// @ts-ignore
if (location.href.startsWith("http://buurtnatuur.be")) {
    // Reload the https version. This is important for the 'locate me' button
    window.location.replace("https://buurtnatuur.be");
}


if (location.href.indexOf("buurtnatuur.be") >= 0) {
    defaultLayout = "buurtnatuur"
}


let testing: UIEventSource<string>;
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    testing = QueryParameters.GetQueryParameter("test", "true");
    // Set to true if testing and changes should NOT be saved
    testing.setData(testing.data ?? "true")
    // If you have a testfile somewhere, enable this to spoof overpass
    // This should be hosted independantly, e.g. with `cd assets; webfsd -p 8080` + a CORS plugin to disable cors rules
    // Overpass.testUrl = "http://127.0.0.1:8080/streetwidths.geojson";
} else {
    testing = QueryParameters.GetQueryParameter("test", "false");
}


// ----------------- SELECT THE RIGHT Theme -----------------


const path = window.location.pathname.split("/").slice(-1)[0];
if (path !== "index.html" && path !== "") {
    defaultLayout = path;
    if (path.endsWith(".html")) {
        defaultLayout = path.substr(0, path.length - 5);
    }
    console.log("Using layout", defaultLayout);
}
defaultLayout = QueryParameters.GetQueryParameter("layout", defaultLayout, "The layout to load into MapComplete").data;
let layoutToUse: LayoutConfig = AllKnownLayouts.allKnownLayouts.get(defaultLayout.toLowerCase());


const userLayoutParam = QueryParameters.GetQueryParameter("userlayout", "false", "If not 'false', a custom (non-official) theme is loaded. This custom layout can be done in multiple ways: \n\n- The hash of the URL contains a base64-encoded .json-file containing the theme definition\n- The hash of the URL contains a lz-compressed .json-file, as generated by the custom theme generator\n- The parameter itself is an URL, in which case that URL will be downloaded. It should point to a .json of a theme");

// Workaround/legacy to keep the old paramters working as I renamed some of them
if (layoutToUse?.id === "cyclofix") {
    const legacy = QueryParameters.GetQueryParameter("layer-bike_shops", "true", "Legacy - keep De Fietsambassade working");
    const correct = QueryParameters.GetQueryParameter("layer-bike_shop", "true", "Legacy - keep De Fietsambassade working")
    if (legacy.data !== "true") {
        correct.setData(legacy.data)
    }
    console.log("layer-bike_shop toggles: legacy:", legacy.data, "new:", correct.data)

    const legacyCafe = QueryParameters.GetQueryParameter("layer-bike_cafes", "true", "Legacy - keep De Fietsambassade working")
    const correctCafe = QueryParameters.GetQueryParameter("layer-bike_cafe", "true", "Legacy - keep De Fietsambassade working")
    if (legacyCafe.data !== "true") {
        correctCafe.setData(legacy.data)
    }
}


const layoutFromBase64 = decodeURIComponent(userLayoutParam.data);

new Combine(["Initializing... <br/>",
    new FixedUiElement("<a>If this message persist, something went wrong - click here to try again</a>")
        .SetClass("link-underline small")
        .onClick(() => {
            localStorage.clear();
            window.location.reload(true);

        })])
    .AttachTo("centermessage"); // Add an initialization and reset button if something goes wrong
document.getElementById("decoration-desktop").remove();


if (layoutFromBase64.startsWith("http")) {
    const link = layoutFromBase64;
    console.log("Downloading map theme from ", link);
    new FixedUiElement(`Downloading the theme from the <a href="${link}">link</a>...`)
        .AttachTo("centermessage");

    $.ajax({
        url: link,
        success: (data) => {

            try {
                console.log("Received ", data)
                let parsed = data;
                if (typeof parsed == "string") {
                    parsed = JSON.parse(data);
                } else {
                    data = JSON.stringify(parsed) // De wereld op zijn kop
                }
                // Overwrite the id to the wiki:value
                parsed.id = link;
                const layout = new LayoutConfig(parsed, false).patchImages(link, data);
                InitUiElements.InitAll(layout, layoutFromBase64, testing, layoutFromBase64, btoa(data));
            } catch (e) {
                new FixedUiElement(`<a href="${link}">${link}</a> is invalid:<br/>${e}<br/> <a href='https://${window.location.host}/'>Go back</a>`)
                    .SetClass("clickable")
                    .AttachTo("centermessage");
                console.error("Could not parse the text", data)
                throw e;
            }
        },
    }).fail((_, textstatus, error) => {
        console.error("Could not download the wiki theme:", textstatus, error)
        new FixedUiElement(`<a href="${link}">${link}</a> is invalid:<br/>Could not download - wrong URL?<br/>` +
            error +
            "<a href='https://${window.location.host}/'>Go back</a>")
            .SetClass("clickable")
            .AttachTo("centermessage");
    });

} else if (layoutFromBase64 !== "false") {
    let [layoutToUse, encoded] = InitUiElements.LoadLayoutFromHash(userLayoutParam);
    InitUiElements.InitAll(layoutToUse, layoutFromBase64, testing, defaultLayout, encoded);
} else if (layoutToUse !== undefined) {
    // This is the default case: a builtin theme
    InitUiElements.InitAll(layoutToUse, layoutFromBase64, testing, defaultLayout);
} else {
    // We fall through: no theme loaded: just show an overview of layouts
    new FixedUiElement("").AttachTo("centermessage")
    State.state = new State(undefined);
    new Combine([new MoreScreen(true),
        Translations.t.general.aboutMapcomplete.SetClass("link-underline")
    ]).SetClass("block m-5 lg:w-3/4 lg:ml-40")
        .SetStyle("pointer-events: all;")
        .AttachTo("topleft-tools");
}
// Remove all context event listeners on mobile to prevent long presses
window.addEventListener('contextmenu', (e) => { // Not compatible with IE < 9

    if (e.target["nodeName"] === "INPUT") {
        return;
    }
    e.preventDefault();
    return false;
}, false);
