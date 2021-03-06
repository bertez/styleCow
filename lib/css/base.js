(function (css) {

	css.Base = Object.create(Array.prototype, {
		executePlugins: {
			value: function (plugins, minSupport, vendor) {
				if (vendor) {
					if (this.vendor && this.vendor !== vendor) {
						return this.remove();
					}
				} else {
					vendor = this.vendor;
				}

				var k = 0;

				while (this[k]) {
					var child = this[k];

					if (child.executed) {
						++k;
						continue;
					}

					child.executePlugins(plugins, minSupport, vendor);

					k = 0;
				}

				plugins.forEach(function (plugin) {
					this.executePlugin(plugin, minSupport, '');
				}, this);

				this.executed = true;
			}
		},

		executePlugin: {
			value: function (plugin, minSupport, suffix) {
				var fnName = this.type + suffix, k, t, execute;

				for (k = 0, t = plugin.length; k < t; k++) {
					execute = plugin[k];

					if (!execute[fnName] || !needFix(minSupport, execute.disable)) {
						continue;
					}

					if (execute[fnName] instanceof Function) {
						execute[fnName](this);
						continue;
					}

					if (!this.name) {
						continue;
					}

					var namePlugin = execute[fnName][this.name];

					if (!namePlugin) {
						namePlugin = execute[fnName][this.module];
					}

					if (namePlugin instanceof Function) {
						namePlugin(this);
						continue;
					}
				}
			}
		},

		clone: {
			value: function () {
				return css[this.type].create(this.toString());
			}
		},

		is: {
			value: function (type, name, value, vendor) {
				if (type && !equals(this.type, type)) {
					return false;
				}

				if (name && !equals(this.name, name)) {
					return false;
				}

				if (value && !equals(this.value, value)) {
					return false;
				}

				if (vendor && !equals(this.vendor, vendor)) {
					return false;
				}

				return true;
			}
		},

		children: {
			value: function (type, name, value, vendor) {
				return this.filter(function (child) {
					return child.is(type, name, value, vendor);
				});
			}
		},

		hasChild: {
			value: function (type, name, value, vendor) {
				return this.some(function (child) {
					return child.is(type, name, value, vendor);
				});
			}
		},

		search: {
			value: function (type, name, value, vendor, result) {
				result = result || [];

				if (this.is(type, name, value,vendor)) {
					result.push(this);
				}

				for (var i = 0, t = this.length; i < t; i++) {
					this[i].search(type, name, value, vendor, result);
				}

				return result;
			}
		},

		has: {
			value: function (type, name, value, vendor) {
				if (this.is(type, name, value, vendor)) {
					return true;
				}

				for (var i = 0, t = this.length; i < t; i++) {
					if (this[i].has(type, name, value, vendor)) {
						return true;
					}
				}

				return false;
			}
		},

		ancestor: {
			value: function (type, name, value, vendor) {
				if (this.is(type, name, value, vendor)) {
					return this;
				}

				if (this.parent) {
					return this.parent.ancestor(type, name, value, vendor);
				}
			}
		},

		content: {
			get: function () {
				return this.map(function (child) {
					return child.toString();
				});
			},
			set: function (value) {
				this.splice(0);

				if (value instanceof Array) {
					value.forEach(function (v) {
						this.add(v);
					}, this);
				} else {
					this.add(value);
				}
			}
		},

		getData: {
			value: function (key) {
				if (this._data && (key in this._data)) {
					return this._data[key];
				}

				if (this.parent) {
					return this.parent.getData(key);
				}
			}
		},

		setData: {
			value: function (key, value) {
				if (!this._data) {
					this._data = {};
				}

				this._data[key] = value;

				return this;
			}
		},

		index: {
			value: function () {
				if (this.parent) {
					return this.parent.indexOf(this);
				}

				return -1;
			}
		},

		add: {
			value: function (child, index, after) {
				if (typeof child !== 'object') {
					child = this.parseChild(''+child);
				}

				child.detach();
				child.parent = this;

				if (index === undefined || (after && index === this.length)) {
					this.push(child);
				} else {
					this.splice(after ? index + 1 : index, 0, child);
				}

				return child;
			}
		},

		append: {
			value: function (child) {
				this.add(child);
			}
		},

		prepend: {
			value: function (child) {
				this.add(child, 0);
			}
		},

		insertBefore: {
			value: function (child) {
				var index = this.index();

				if (index !== -1) {
					return this.parent.add(child, index);
				}
			}
		},

		insertAfter: {
			value: function (child) {
				var index = this.index();

				if (index !== -1) {
					return this.parent.add(child, index, true);
				}
			}
		},

		cloneBefore: {
			value: function () {
				return this.insertBefore(this.clone());
			}
		},

		cloneAfter: {
			value: function () {
				return this.insertAfter(this.clone());
			}
		},

		replaceWith: {
			value: function (child) {
				var index = this.index();

				if (index !== -1) {
					var parent = this.parent;
					this.remove();

					return parent.add(child, index);
				}
			}
		},

		remove: {
			value: function (propagate) {
				if (!propagate) {
					this.detach();
				}

				this.forEach(function (child) {
					child.remove(true);
				});

				this.parent = null;
				this.splice(0);

				return this;
			}
		},

		detach: {
			value: function () {
				var index = this.index();

				if (index !== -1) {
					this.parent.splice(index, 1);
					this.parent = null;
				}

				return this;
			}
		},

		toCode: {
			value: function () {
				return this.toString();
			}
		}
	});

	function equals (value, needle) {
		if (needle === true) {
			return value ? true : false;
		}

		if (typeof needle === 'string') {
			return (needle === value);
		}

		if (needle instanceof Array) {
			return (needle.indexOf(value) !== -1);
		}

		if (needle instanceof RegExp) {
			return needle.test(value);
		}

		return true;
	}

	function needFix (minSupport, disablePlugin) {
		if (!disablePlugin || !minSupport) {
			return true;
		}

		for (var browser in disablePlugin) {
			if (minSupport[browser] === false) {
				continue;
			}

			if (disablePlugin[browser] === false || minSupport[browser] < disablePlugin[browser]) {
				return true;
			}
		}

		return false;
	}

})(require('../css'));