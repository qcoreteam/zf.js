"use strict";
/*
 * TopJs Framework (http://www.topjs.org/)
 *
 * @link      http://github.com/qcoreteam/topjs for the canonical source repository
 * @copyright Copyright (c) 2016-2017 QCoreTeam (http://www.qcoreteam.org)
 * @license   http://www.topjs.org/license/new-bsd New BSD License
 */

TopJs.namespace("TopJs.code.generator");

/**
 * @alias TopJs.code.generator.GeneratorInterface
 */
class GeneratorInterface
{
    generate()
    {}
}

TopJs.registerClass("TopJs.code.generator.GeneratorInterface", GeneratorInterface);
module.exports = GeneratorInterface;
