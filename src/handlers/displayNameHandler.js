/*
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 *
 */

import type Documentation from '../Documentation';

import getMemberValuePath from '../utils/getMemberValuePath';
import resolveName from '../utils/resolveName';
import recast from 'recast';
import resolveToValue from '../utils/resolveToValue';
import isExportsOrModuleAssignment from '../utils/isExportsOrModuleAssignment';
import resolveExportDeclaration from '../utils/resolveExportDeclaration'

var {types: {namedTypes: types}} = recast;

function getOrInferDisplayName(path) {
    var displayNamePath = getMemberValuePath(path, 'displayName');

    if (displayNamePath) {
      displayNamePath = resolveToValue(displayNamePath);
      if (!displayNamePath || !types.Literal.check(displayNamePath.node)) {
        return;
      }
      return displayNamePath.node.value;
    } else if (!displayNamePath && path.node.id) {
      return path.node.id.name;
    } else if (!displayNamePath && resolveName(path)) {
      return resolveName(path);
    }
}

export default function displayNameHandler(
  documentation: Documentation,
  path: NodePath
) {
  var displayName;

    //If not immediately exported via ES6 or CommonJS exports or an ExpressionStatement
  if (!types.ExportNamedDeclaration.check(path.node) && !isExportsOrModuleAssignment(path) && !types.ExpressionStatement.check(path.node)) {
    displayName = getOrInferDisplayName(path);

    //ES6 Exports
  } else if (types.ExportNamedDeclaration.check(path.node)) {
    var declarationPath;
    var declaration = path.node.declaration;

    if (
        declaration.type === types.ClassDeclaration.name ||
        declaration.type === types.FunctionDeclaration.name ||
        declaration.type === types.FunctionExpression.name
      ) {
      declarationPath = resolveExportDeclaration(path)[0];

    } else if (declaration.type === types.VariableDeclaration.name) {

      declarationPath = resolveExportDeclaration(path)[0].parentPath.parentPath.parentPath;
    }

    displayName = getOrInferDisplayName(declarationPath);

    //CommonJS export.X
  } else if (isExportsOrModuleAssignment(path)) {
    displayName = resolveToValue(path).get('expression', 'left', 'property', 'name').value;

  } else if (types.ExpressionStatement.check(path.node) && path.node.expression.id) {
    displayName = path.node.expression.id.name;
  }
  documentation.set('displayName', displayName);
}
