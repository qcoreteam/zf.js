"use strict";
/*
 * TopJs Framework (http://www.topjs.org/)
 *
 * @link      http://github.com/qcoreteam/topjs for the canonical source repository
 * @copyright Copyright (c) 2016-2017 QCoreTeam (http://www.qcoreteam.org)
 * @license   http://www.topjs.org/license/new-bsd New BSD License
 */

import {is_object, in_array, rtrim, is_string, change_str_at, file_exist} from '../internal/Funcs';
import {sep as dir_separator, dirname} from 'path';
import {stat, statSync} from 'fs';
import Namespace from "./Namespace";
import path from "path"

/**
 * 标准自动加载器
 * <font color="red">注意，这个类为底层自动加载类，一般只在入口文件进行实例化。</font>
 * ```javascript
 *
 *    let loader = new StandardLoader({
 *       [StandardLoader.AUTO_REGISTER_TOPJS] : true
 *    });
 *    loader.register();
 *
 * ```
 * @class TopJs.Loader
 * @singleton
 */
let Loader = TopJs.Loader = {};

TopJs.apply(Loader, /** @lends TopJs.Loader */{
    /**
     * @readonly
     * @static
     * @property {string} NS_SEPARATOR 名称空间分隔符
     */
    NS_SEPARATOR: ".",
    /**
     * @readonly
     * @static
     * @property {string} LOAD_NS 参数批量设置的时候名称空间项识别码常量
     */
    LOAD_NS: "namespaces",

    /**
     * @readonly
     * @static
     * @property {string} NAMESPACE_ACCESSOR_KEY 对象代理访问时候获取名称空间对象的特殊键名
     */
    NAMESPACE_ACCESSOR_KEY: "__NAMESPACE_ACCESSOR_KEY__",

    /**
     * @protected
     * @property {Map[]} namespaces 名称空间到类的文件夹之间的映射
     */
    namespaces: new Map(),

    /**
     * @protected
     * @property {boolean} registered 是否已经注册过，一个loader只能注册一次
     */
    registered: false,

    /**
     * @protected
     * @property {Map} proxyCache proxy对象的缓存
     */
    proxyCache: new Map(),

    /**
     * 注册一个名称空间到对应文件夹的映射项
     *
     * @param {string} namespace
     * @param {string} directory
     * @returns {TopJs.Loader}
     */
    registerNamespace(namespace, directory)
    {
        let sep = Loader.NS_SEPARATOR;
        namespace = rtrim(namespace, sep);
        let parts = namespace.split(sep);
        let nsObj;
        if (this.namespaces.has(parts[0])) {
            nsObj = this.namespaces.get(parts[0]);
        } else {
            nsObj = new Namespace(parts[0], null, null);
            this.namespaces.set(parts[0], nsObj);
        }
        //子名称空间
        for (let i = 1; i < parts.length; i++) {
            let childNsObj = nsObj.getChildNamespace(parts[i]);
            if (null === childNsObj) {
                nsObj = new Namespace(parts[i], nsObj, null);
            } else {
                nsObj = childNsObj;
            }
        }
        try {
            nsObj.setDirectory(this.normalizeDirectory(directory));
        } catch (err) {}
        return nsObj;
    },

    /**
     * 一次性注册多个名称空间到文件目录的映射, `namespace`参数结构如下：
     * ```javascript
     * {
         *    namespace1: dir1,
         *    namespace2: dir2,
         *    ...
         * }
     * ```
     *
     * @param {Object} namespaces 需要注册的名称空间类型
     * @returns {TopJs.Loader}
     */
    registerNamespaces(namespaces)
    {
        if (!is_object(namespaces)) {
            throw new Error('arg namespaces must be object');
        }
        for (let [namespace, direcotry] of Object.entries(namespaces)) {
            this.registerNamespace(namespace, direcotry);
        }
        return this;
    },

    /**
     * 通过名称空间名称，获取底层名称空间对象引用
     *
     * @param {Object} name 名称空间的名称
     * @returns {TopJs.Namespace}
     */
    getNamespace(name)
    {
        let parts = name.split(Loader.NS_SEPARATOR);
        let ns;
        if (!this.namespaces.has(parts[0])) {
            return null;
        }
        ns = this.namespaces.get(parts[0]);
        for (let i = 1; i < parts.length; i++) {
            ns = ns.getChildNamespace(parts[i]);
            if (null == ns) {
                break;
            }
        }
        return ns;
    },

    require(fullClsName)
    {
        let parts = fullClsName.split(".");
        let clsName = parts.pop();
        let ns = parts.join(".");
        let nsObject = this.createNamespace(ns);
        try {
            let filename = path.resolve(nsObject.directory, `${clsName}.js`);
            let stats = statSync(filename);
            if (stats.isFile()) {
                let Cls = require(filename);
                // 支持加载普通的类
                // 通过TopJs.define定义的类自动操作名称空间
                if (!nsObject.children.has(clsName)) {
                    nsObject.children.set(clsName, Cls);
                    return Cls;
                }
            }
        } catch (err) {
            if ("ENOENT" === err.code) {
                let filename = nsObject.directory + `${clsName}.js`;
                err.message = `require: class file ${filename} not exist`;
            }
            throw err;
        }
    },

    /**
     * @param {String} namespace 名称空间的字符串描述
     * @return {Namespace}
     */
    createNamespace(namespace)
    {
        let parts = namespace.split(Loader.NS_SEPARATOR);
        let ns;
        let nsDir;
        let partName;
        let parentNs;
        if (!this.namespaces.has(parts[0])) {
            return null;
        }
        ns = this.namespaces.get(parts[0]);
        for (let i = 1; i < parts.length; i++) {
            partName = parts[i];
            nsDir = ns.directory;
            parentNs = ns;
            ns = ns.getChildNamespace(partName);
            if (null == ns) {
                //判断文件夹是否存在
                try {
                    let filename = path.resolve(nsDir, partName);
                    let stats = statSync(filename);
                    if (stats.isDirectory()) {
                        ns = new Namespace(partName, parentNs, filename);
                    }
                } catch (err) {
                    if ("ENOENT" === err.code) {
                        let dir = nsDir + dir_separator + partName;
                        err.message = `create namespace error: directory ${dir} not exist`;
                    }
                    throw err;
                }
            }
        }
        return ns;
    },
    
    /**
     * 格式化加载目录，主要就是在路径的末尾加上路径分隔符
     *
     * @protected
     * @param {string} directory 需要进行处理的文件夹路径
     * @return {string}
     */
    normalizeDirectory(directory)
    {
        let len = directory.length;
        let last = directory.charAt(len - 1);
        if (in_array(last, ["/", "\\"])) {
            return change_str_at(directory, len - 1, dir_separator);
        }
        directory += dir_separator;
        return directory;
    },

    /**
     * 将类的全名转换成名称空间对应的文件夹路径
     *
     * @param {string} fullClsName 带名称空间的类的名称
     * @param {string} [dir=process.cwd()] 起点文件夹路径
     * @returns {string}
     */
    transformClassNameToFilenameByNamespace(fullClsName, dir = process.cwd())
    {
        let parts = fullClsName.split(".");
        let clsName = parts.pop();
        let ns = parts.join(".");
        let nsObj = null;
        let midParts = [];
        while (!(nsObj = this.getNamespace(ns)) && parts.length > 0) {
            midParts.push(parts.pop());
            ns = parts.join(".");
        }
        if (nsObj) {
            dir = nsObj.directory;
        }
        dir = this.normalizeDirectory(dir);
        if (midParts.length > 0) {
            dir += midParts.join(dir_separator) + dir_separator;
        }
        return dir + clsName + '.js'
    }
});

/**
 * 加载指定的类
 * @method
 */
TopJs.require = TopJs.Function.alias(Loader, 'require');