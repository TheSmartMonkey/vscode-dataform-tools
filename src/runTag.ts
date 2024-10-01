import { getDataformCompilationTimeoutFromConfig, getWorkspaceFolder, runCommandInTerminal } from "./utils";
import * as vscode from 'vscode';


export function getRunTagsWtOptsCommand(workspaceFolder: string, tags: string | object[], dataformCompilationTimeoutVal: string, includDependencies: boolean, includeDownstreamDependents: boolean, fullRefresh: boolean): string {
    let cmd = `dataform run ${workspaceFolder} --timeout=${dataformCompilationTimeoutVal}`;
    if (typeof tags === "object") {
        for (let tag of tags) {
            cmd += ` --tags=${tag}`;
        }
    } else {
        cmd += ` --tags=${tags}`;
    }

    if (includDependencies) {
        cmd += ` --include-deps`;
    }
    if (includeDownstreamDependents) {
        cmd += ` --include-dependents`;
    }
    if (fullRefresh) {
        cmd += ` --full-refresh`;
    }
    return cmd;
}

export async function runTag(includeDependencies: boolean, includeDependents: boolean) {
    if (dataformTags.length === 0) {
        vscode.window.showInformationMessage('No tags found in project');
        return;
    }
    vscode.window.showQuickPick(dataformTags, {
        onDidSelectItem: (_) => {
            // This is triggered as soon as a item is hovered over
        }
    }).then((selection) => {
        if (!selection) {
            return;
        }

        let workspaceFolder = getWorkspaceFolder();
        if (!workspaceFolder) { return; }

        let defaultDataformCompileTime = getDataformCompilationTimeoutFromConfig();
        let cmd = "";
        if (includeDependencies) {
            cmd = getRunTagsWtOptsCommand(workspaceFolder, selection, defaultDataformCompileTime, true, false, false);
        } else if (includeDependents) {
            cmd = getRunTagsWtOptsCommand(workspaceFolder, selection, defaultDataformCompileTime, false, true, false);
        } else {
            cmd = getRunTagsWtOptsCommand(workspaceFolder, selection, defaultDataformCompileTime, false, false, false);
        }
        if (cmd !== "") {
            runCommandInTerminal(cmd);
        }
    });
}
