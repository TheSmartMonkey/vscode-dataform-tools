import * as vscode from 'vscode';
import { extractFixFromDiagnosticMessage } from './utils';

export let dataformCodeActionProviderDisposable = () => vscode.languages.registerCodeActionsProvider('sql', {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context, token) {
        const diagnostics = context.diagnostics.filter(diag => diag.severity === vscode.DiagnosticSeverity.Error);
        if (diagnostics.length === 0) {
            return;
        }

        const codeActions = diagnostics.map(diagnostic => {
            const fixAction = new vscode.CodeAction('Replace with dry run suggestion', vscode.CodeActionKind.QuickFix);
            fixAction.command = {
                command: 'vscode-dataform-tools.fixError',
                title: 'Apply dry run suggestion',
                tooltip: 'Apply dry run suggestion',
                arguments: [document, diagnostic.range, diagnostic.message]
            };
            fixAction.diagnostics = [diagnostic];
            fixAction.isPreferred = true;
            return fixAction;
        });

        return codeActions;
    }
}, {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
});


export let applyCodeActionUsingDiagnosticMessage = (range: vscode.Range, diagnosticMessage: string) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // get the position; i.e line number and start index of the error
    // needs to be offset by one based on testing
    const position = range.start;
    const adjustedPosition = new vscode.Position(position.line, position.character - 1);

    const fix = extractFixFromDiagnosticMessage(diagnosticMessage);
    if (fix === null){
        return;
    }

    // apply the fix by only replacing the word that is incorrect
    editor.edit(async editBuilder => {
        let wordEndPosition = editor.document.getWordRangeAtPosition(adjustedPosition)?.end;
        if (wordEndPosition) {
            let myRange = new vscode.Range(adjustedPosition, wordEndPosition);
            editBuilder.replace(myRange, fix);
        }

    });
};
