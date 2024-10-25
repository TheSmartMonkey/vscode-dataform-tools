import { Assertion, Declarations, DeclarationsLegendMetadata, DependancyTreeMetadata, Operation, Table, Target } from "./types";
import { getWorkspaceFolder, runCompilation } from "./utils";

function populateDependancyTree(type: string, structs: Table[] | Operation[] | Assertion[] | Declarations[], dependancyTreeMetadata: DependancyTreeMetadata[], schemaDict: any, schemaIdx: number) {
    let declarationsLegendMetadata: DeclarationsLegendMetadata[] = [];
    let addedSchemas: string[] = [];
    let schemaIdxTracker = 0;

    //_schema_idx 0 is reserved for nodes generated by Dataform pipeline
    declarationsLegendMetadata.push({
        "_schema": "dataform",
        "_schema_idx": 0
    });

    structs.forEach((struct) => {
        let tableName = `${struct.target.database}.${struct.target.schema}.${struct.target.name}`;
        let tags = struct.tags;
        let fileName = struct.fileName;
        let schema = `${struct.target.schema}`;

        // NOTE: Only adding colors in web panel for tables declared in declarations
        if (type === "declarations") {
            if (schemaDict.hasOwnProperty(schema)) {
                schemaIdx = schemaDict[schema];
            } else {
                schemaDict[schema] = schemaIdxTracker + 1;
                schemaIdxTracker += 1;
                schemaIdx = schemaIdxTracker;
            }
        }

        let dependancyTargets = struct?.dependencyTargets;

        let depedancyList: string[] = [];
        if (dependancyTargets) {
            dependancyTargets.forEach((dep: Target) => {
                let dependancyTableName = `${dep.database}.${dep.schema}.${dep.name}`;
                depedancyList.push(dependancyTableName);
            });
        }

        if (depedancyList.length === 0) {
            dependancyTreeMetadata.push(
                {
                    "_name": tableName,
                    "_fileName": fileName,
                    "_schema": schema,
                    "_tags": tags,
                    "_schema_idx": (struct.hasOwnProperty("type")) ? 0 : schemaIdx
                }
            );
        } else {
            dependancyTreeMetadata.push(
                {
                    "_name": tableName,
                    "_fileName": fileName,
                    "_schema": schema,
                    "_deps": depedancyList,
                    "_tags": tags,
                    "_schema_idx": (struct.hasOwnProperty("type")) ? 0 : schemaIdx
                }
            );
        }

        if (type === "declarations") {
            if (!addedSchemas.includes(schema)) {
                declarationsLegendMetadata.push({
                    "_schema": schema,
                    "_schema_idx": schemaIdx
                });
                addedSchemas.push(schema);
            }
        }
    });
    return { "dependancyTreeMetadata": dependancyTreeMetadata, "schemaIdx": schemaIdx, "declarationsLegendMetadata": declarationsLegendMetadata };
}

export async function generateDependancyTreeMetadata(): Promise<{ dependancyTreeMetadata: DependancyTreeMetadata[], declarationsLegendMetadata: DeclarationsLegendMetadata[] } | undefined> {
    let dependancyTreeMetadata: DependancyTreeMetadata[] = [];
    let schemaDict = {}; // used to keep track of unique schema names ( gcp dataset name ) already seen in the compiled json declarations
    let schemaIdx = 0;   // used to assign a unique index to each unique schema name for color coding dataset in the web panel

    if (!CACHED_COMPILED_DATAFORM_JSON) {

        let workspaceFolder = getWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        let dataformCompiledJson = await runCompilation(workspaceFolder); // Takes ~1100ms
        if (dataformCompiledJson) {
            CACHED_COMPILED_DATAFORM_JSON = dataformCompiledJson;
        }
    }

    let output;
    if (!CACHED_COMPILED_DATAFORM_JSON) {
        return { "dependancyTreeMetadata": output ? output["dependancyTreeMetadata"] : dependancyTreeMetadata, "declarationsLegendMetadata": output ? output["declarationsLegendMetadata"] : [] };
    }
    let tables = CACHED_COMPILED_DATAFORM_JSON.tables;
    let operations = CACHED_COMPILED_DATAFORM_JSON.operations;
    let assertions = CACHED_COMPILED_DATAFORM_JSON.assertions;
    let declarations = CACHED_COMPILED_DATAFORM_JSON.declarations;

    if (tables) {
        output = populateDependancyTree("tables", tables, dependancyTreeMetadata, schemaDict, schemaIdx);
    }
    if (operations) {
        output = populateDependancyTree("operations", operations, output ? output["dependancyTreeMetadata"] : dependancyTreeMetadata, schemaDict, output ? output["schemaIdx"] : schemaIdx);
    }
    if (assertions) {
        output = populateDependancyTree("assertions", assertions, output ? output["dependancyTreeMetadata"] : dependancyTreeMetadata, schemaDict, output ? output["schemaIdx"] : schemaIdx);
    }
    if (declarations) {
        output = populateDependancyTree("declarations", declarations, output ? output["dependancyTreeMetadata"] : dependancyTreeMetadata, schemaDict, output ? output["schemaIdx"] : schemaIdx);
    }
    return { "dependancyTreeMetadata": output ? output["dependancyTreeMetadata"] : dependancyTreeMetadata, "declarationsLegendMetadata": output ? output["declarationsLegendMetadata"] : [] };
}
