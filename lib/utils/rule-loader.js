/**
 * @fileoverview Load specified rule definitions from the given rule repository.
 * @author Raghav Dua <duaraghav8@gmail.com>
 */

"use strict";

let path = require("path"), util = require("util");
let isAValidSharableConfig = require("./config-inspector").isAValidSharableConfig;

let constants = {
    SOLIUM_RULESET_ALL: "solium:all",
    SOLIUM_RULESET_RECOMMENDED: "solium:all",
    SOLIUM_CORE_RULES_DIRNAME: "rules",
    SOLIUM_PLUGIN_PREFIX: "solium-plugin-",
    SOLIUM_SHARABLE_CONFIG_PREFIX: "solium-config-"
};

constants.SOLIUM_CORE_RULES_DIRPATH = "../" + constants.SOLIUM_CORE_RULES_DIRNAME;


/**
 * Given a ruleset name, determine whether its a core set or a sharable config and load the rule config accordingly.
 * @param {String} upstream The ruleset to resolve
 * @returns {Object} ruleConfigs Set of rule configs exported by the upstream ruleset.
 */
function resolveUpstream(upstream) {
    let coreRulesetRegExp = /^solium:[a-z_]+$/;

    // Determine whether upstream is a solium core ruleset or a sharable config.
    if (coreRulesetRegExp.test(upstream)) {
        try {
            return require("../../config/rulesets/solium-" + upstream.split(":") [1]).rules;
        } catch (e) {
            throw new Error("\"" + upstream + "\" is not a core ruleset.");
        }
    }

    // If flow reaches here, it means upstream is a sharable config.
    let configName = constants.SOLIUM_SHARABLE_CONFIG_PREFIX + upstream, config;

    try {
        config = require(configName);
    } catch (e) {
        if (e.code === "MODULE_NOT_FOUND") {
            throw new Error(
                "The sharable config \"" + configName + "\" is not installed. " +
				"If Solium is installed globally, install the config globally using " +
				"\"npm install -g " + configName + "\". Else install locally using " +
				"\"npm install --save-dev " + configName + "\"."
            );
        }

        throw new Error("The sharable config \"" + configName + "\" could not be loaded: " + e.message);
    }

    if (isAValidSharableConfig(config)) {
        return config.rules;
    }

    throw new Error("Invalid sharable config \"" +
		configName + "\". AJV message:\n" + util.inspect(isAValidSharableConfig.errors));
}



/**
 * Create provided plugin's default rule configuration
 * @param {String} name Plugin name without 'solium-plugin-' prefix
 * @param {Object} plugin The plugin Object as exported by the solium plugin
 * @returns {Object} config Rule configuration object for the given plugin
 */
function resolvePluginConfig(name, plugin) {
    let config = {};

    Object.keys(plugin.rules).forEach(function(ruleName) {
        config [name + "/" + ruleName] = plugin.rules [ruleName].meta.docs.type;
    });

    return config;
}


let ruleDefs = {
    'arg-overflow': require('../rules/arg-overflow'),
    'array-declarations': require('../rules/array-declarations'),
    'blank-lines': require('../rules/blank-lines'),
    'camelcase': require('../rules/camelcase'),
    'comma-whitespace': require('../rules/comma-whitespace'),
    'conditionals-whitespace': require('../rules/conditionals-whitespace'),
    'constructor': require('../rules/constructor'),
    'deprecated-suicide': require('../rules/deprecated-suicide'),
    'double-quotes': require('../rules/double-quotes'),
    'emit': require('../rules/emit'),
    'error-reason': require('../rules/error-reason'),
    'function-order': require('../rules/function-order'),
    'function-whitespace': require('../rules/function-whitespace'),
    'imports-on-top': require('../rules/imports-on-top'),
    'indentation': require('../rules/indentation'),
    'lbrace': require('../rules/lbrace'),
    'linebreak-style': require('../rules/linebreak-style'),
    'max-len': require('../rules/max-len'),
    'mixedcase': require('../rules/mixedcase'),
    'no-constant': require('../rules/no-constant'),
    'no-empty-blocks': require('../rules/no-empty-blocks'),
    'no-experimental': require('../rules/no-experimental'),
    'no-trailing-whitespace': require('../rules/no-trailing-whitespace'),
    'no-unused-vars': require('../rules/no-unused-vars'),
    'no-with': require('../rules/no-with'),
    'operator-whitespace': require('../rules/operator-whitespace'),
    'pragma-on-top': require('../rules/pragma-on-top'),
    'quotes': require('../rules/quotes'),
    'semicolon-whitespace': require('../rules/semicolon-whitespace'),
    'uppercase': require('../rules/uppercase'),
    'value-in-payable': require('../rules/value-in-payable'),
    'variable-declarations': require('../rules/variable-declarations'),
    'visibility-first': require('../rules/visibility-first'),
    'whitespace': require('../rules/whitespace'),
};

/**
 * Load rule definitions (rule objects) from Solium's core rule directory & from pre-installed linter plugins.
 * @param {Array} listOfRules List of string that representing rule file names in the rule dir.
 * @returns {Object} ruleDefs Object of key: rule name & value: rule object exported by corresponding Solium rule definition.
 */
function load(listOfRules, plugins) {
    listOfRules.forEach(function(name) {
        // If the rule is part of a plugin, first load the plugin assuming that it has already been installed
        // in the same scope as Solium (global/project). Then return the appropriate rule from that plugin.
        if (name.indexOf("/") > -1) {
            let parts = name.split("/"),
                pluginName = constants.SOLIUM_PLUGIN_PREFIX + parts [0], ruleName = parts [1], plugin;

            try {
                plugin = plugins[pluginName]; // require(pluginName);
            } catch (e) {
                throw new Error("Unable to load Plugin \"" + pluginName + "\".");
            }

            // No need to verify whether this rule's implementation exists & is valid or not.
            // That is done at a later stage in solium.js itself using rule-inspector.
            // TODO: Examine "peerDependencies" of the plugin to ensure its compatible with current version of Solium.
            return ruleDefs [name] = plugin.rules [ruleName];
        }

        // If we're here, it means the rule is just a regular core rule :)
        let ruleFile = path.join(constants.SOLIUM_CORE_RULES_DIRPATH, name);

        try {
            // ruleDefs [name] = require(ruleFile);
        } catch (e) {
            throw new Error("Unable to read " + ruleFile);
        }
    });

    return ruleDefs;
}


module.exports = {
    load: load,
    constants: constants,
    resolveUpstream: resolveUpstream,
    resolvePluginConfig: resolvePluginConfig
};
