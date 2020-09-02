import {UIElement} from "../UIElement";
import {UIEventSource} from "../../Logic/UIEventSource";
import {LayoutConfigJson} from "../../Customizations/JSON/LayoutConfigJson";
import SettingsTable from "./SettingsTable";
import SingleSetting from "./SingleSetting";
import {SubtleButton} from "../Base/SubtleButton";
import Combine from "../Base/Combine";
import {TextField} from "../Input/TextField";
import {InputElement} from "../Input/InputElement";
import MultiLingualTextFields from "../Input/MultiLingualTextFields";
import {CheckBox} from "../Input/CheckBox";
import {AndOrTagInput} from "../Input/AndOrTagInput";
import TagRenderingPanel from "./TagRenderingPanel";
import {GenerateEmpty} from "./GenerateEmpty";
import {DropDown} from "../Input/DropDown";
import {TagRenderingConfigJson} from "../../Customizations/JSON/TagRenderingConfigJson";
import {MultiInput} from "../Input/MultiInput";
import {Tag} from "../../Logic/Tags";
import {LayerConfigJson} from "../../Customizations/JSON/LayerConfigJson";

/**
 * Shows the configuration for a single layer
 */
export default class LayerPanel extends UIElement {
    private readonly _config: UIEventSource<LayoutConfigJson>;

    private readonly settingsTable: UIElement;
    private readonly renderingOptions: UIElement;

    private readonly deleteButton: UIElement;

    public readonly selectedTagRendering: UIEventSource<TagRenderingPanel>
        = new UIEventSource<TagRenderingPanel>(undefined);
    private tagRenderings: UIElement;

    constructor(config: UIEventSource<LayoutConfigJson>,
                languages: UIEventSource<string[]>,
                index: number,
                currentlySelected: UIEventSource<SingleSetting<any>>) {
        super();
        this._config = config;
        this.renderingOptions = this.setupRenderOptions(config, languages, index, currentlySelected);

        const actualDeleteButton = new SubtleButton(
            "./assets/delete.svg",
            "Yes, delete this layer"
        ).onClick(() => {
            config.data.layers.splice(index, 1);
            config.ping();
        });

        this.deleteButton = new CheckBox(
            new Combine(
                [
                    "<h3>Confirm layer deletion</h3>",
                    new SubtleButton(
                        "./assets/close.svg",
                        "No, don't delete"
                    ),
                    "<span class='alert'>Deleting a layer can not be undone!</span>",
                    actualDeleteButton
                ]
            ),
            new SubtleButton(
                "./assets/delete.svg",
                "Remove this layer"
            )
        )

        function setting(input: InputElement<any>, path: string | string[], name: string, description: string | UIElement): SingleSetting<any> {
            let pathPre = ["layers", index];
            if (typeof (path) === "string") {
                pathPre.push(path);
            } else {
                pathPre = pathPre.concat(path);
            }

            return new SingleSetting<any>(config, input, pathPre, name, description);
        }


        this.settingsTable = new SettingsTable([
                setting(TextField.StringInput(), "id", "Id", "An identifier for this layer<br/>This should be a simple, lowercase, human readable string that is used to identify the layer."),
                setting(new MultiLingualTextFields(languages), "title", "Title", "The human-readable name of this layer<br/>Used in the layer control panel and the 'Personal theme'"),
                setting(new MultiLingualTextFields(languages, true), "description", "Description", "A description for this layer.<br/>Shown in the layer selections and in the personal theme"),
                setting(TextField.NumberInput("nat", n => n < 23), "minzoom", "Minimal zoom",
                    "The minimum zoomlevel needed to load and show this layer."),
                setting(new DropDown("", [
                        {value: 0, shown: "Show ways and areas as ways and lines"},
                        {value: 1, shown: "Show both the ways/areas and the centerpoints"},
                        {value: 2, shown: "Show everything as centerpoint"}]), "wayHandling", "Way handling",
                    "Describes how ways and areas are represented on the map: areas can be represented as the area itself, or it can be converted into the centerpoint"),

                setting(new AndOrTagInput(), "overpassTags", "Overpass query",
                    "The tags of the objects to load from overpass"),

            ],
            currentlySelected);
        const self = this;

        const tagRenderings = new MultiInput<TagRenderingConfigJson>("Add a tag rendering/question",
            () => ({}),
            () => {
                const tagPanel = new TagRenderingPanel(languages, currentlySelected)
                self.registerTagRendering(tagPanel);
                return tagPanel;
            });
        tagRenderings.GetValue().addCallback(
            tagRenderings => {
                (config.data.layers[index] as LayerConfigJson).tagRenderings = tagRenderings;
                config.ping();
            }
        )

        function loadTagRenderings() {
            const values = (config.data.layers[index] as LayerConfigJson).tagRenderings;
            const renderings: TagRenderingConfigJson[] = [];
            for (const value of values) {
                if (typeof (value) !== "string") {
                    renderings.push(value);
                }

            }
            tagRenderings.GetValue().setData(renderings);
        }

        loadTagRenderings();

        this.tagRenderings = tagRenderings;


    }

    private setupRenderOptions(config: UIEventSource<LayoutConfigJson>,
                               languages: UIEventSource<string[]>,
                               index: number,
                               currentlySelected: UIEventSource<SingleSetting<any>>): UIElement {
        const iconSelect = new TagRenderingPanel(
            languages, currentlySelected,
            {
                title: "Icon",
                description: "A visual representation for this layer and for the points on the map.",
                disableQuestions: true
            });
        const size = new TagRenderingPanel(languages, currentlySelected,
            {
                title: "Icon Size",
                description: "The size of the icons on the map in pixels. Can vary based on the tagging",
                disableQuestions: true
            });
        const color = new TagRenderingPanel(languages, currentlySelected,
            {
                title: "Way and area color",
                description: "The color or a shown way or area. Can vary based on the tagging",
                disableQuestions: true
            });
        const stroke = new TagRenderingPanel(languages, currentlySelected,
            {
                title: "Stroke width",
                description: "The width of lines representing ways and the outline of areas. Can vary based on the tags",
                disableQuestions: true
            });
        this.registerTagRendering(iconSelect);
        this.registerTagRendering(size);
        this.registerTagRendering(color);
        this.registerTagRendering(stroke);

        function setting(input: InputElement<any>, path, isIcon: boolean = false): SingleSetting<TagRenderingConfigJson> {
            return new SingleSetting(config, input, ["layers", index, path], undefined, undefined)
        }

        return new SettingsTable([
            setting(iconSelect, "icon"),
            setting(size, "size"),
            setting(color, "color"),
            setting(stroke, "stroke")
        ], currentlySelected);
    }

    private registerTagRendering(
        tagRenderingPanel: TagRenderingPanel) {

        tagRenderingPanel.IsHovered().addCallback(isHovering => {
            if (!isHovering) {
                return;
            }
            this.selectedTagRendering.setData(tagRenderingPanel);
        })
    }

    InnerRender(): string {
        return new Combine([
            "<h2>General layer settings</h2>",
            this.settingsTable,
            "<h2>Map rendering options</h2>",
            this.renderingOptions,
            "<h2>Tag rendering and questions</h2>",
            this.tagRenderings,
            "<h2>Layer delete</h2>",
            this.deleteButton
        ]).Render();
    }
}