"use strict";
/*
 * TopJs Framework (http://www.topjs.org/)
 *
 * @link      http://github.com/qcoreteam/topjs for the canonical source repository
 * @copyright Copyright (c) 2016-2017 QCoreTeam (http://www.qcoreteam.org)
 * @license   http://www.topjs.org/license/new-bsd New BSD License
 */

TopJs.namespace("TopJs.namespace");

let DoubleLinkedList = TopJs.require("TopJs.stdlib.Queue");

/**
 * @class TopJs.stdlib.Stack
 * @author https://github.com/vovazolotoy/TypeScript-STL
 */
class Stack extends DoubleLinkedList
{
}

TopJs.registerClass("TopJs.stdlib.Stack", Stack);
module.exports = Stack;