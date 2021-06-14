import {Utils} from "../Utils";

Utils.runningFromConsole = true;
import SpecialVisualizations from "../UI/SpecialVisualizations";
import SimpleMetaTagger from "../Logic/SimpleMetaTagger";
import Combine from "../UI/Base/Combine";
import {ExtraFunction} from "../Logic/ExtraFunction";
import ValidatedTextField from "../UI/Input/ValidatedTextField";
import BaseUIElement from "../UI/BaseUIElement";
import Translations from "../UI/i18n/Translations";
import {writeFileSync} from "fs";
import LayoutConfig from "../Customizations/JSON/LayoutConfig";
import State from "../State";
import {QueryParameters} from "../Logic/Web/QueryParameters";


function WriteFile(filename, html: string | BaseUIElement): void {
    writeFileSync(filename, Translations.W(html).AsMarkdown());
}

WriteFile("./Docs/SpecialRenderings.md", SpecialVisualizations.HelpMessage)
WriteFile("./Docs/CalculatedTags.md", new Combine([SimpleMetaTagger.HelpText(), ExtraFunction.HelpText()]).SetClass("flex-col"))
WriteFile("./Docs/SpecialInputElements.md", ValidatedTextField.HelpText());


new State(new LayoutConfig({
    language: ["en"],
    id: "<theme>",
    maintainer: "pietervdvn",
    version: "0",
    title: "<theme>",
    description: "A theme to generate docs with",
    startLat: 0,
    startLon: 0,
    startZoom: 0,
    icon: undefined,
    layers: [
        {
            name: "<layer>",
            id: "<layer>",
            source: {
                osmTags: "id~*"
            }
        }
    ]

}))
QueryParameters.GetQueryParameter("layer-<layer-id>", "true", "Wether or not the layer with id <layer-id> is shown")

WriteFile("./Docs/URL_Parameters.md", QueryParameters.GenerateQueryParameterDocs())

console.log("Generated docs")

