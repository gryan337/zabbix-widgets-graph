

class CWidgetSvgGraphRME extends CWidget {

	static DATASET_TYPE_SINGLE_ITEM = 0;
	static AGGREGATE_GROUPING_DATASET = 1;
	static AGGREGATE_GROUPING_EACH_ITEM = 0;
	static AXIS_RIGHT = '1';
	static AXIS_LEFT = '0';
	static MAX_MULTIPLIER = 1.15;
	static MIN_MULTIPLIER = 0.85;

	#seconds_per_day = 86400;
	#seconds_per_hour = 3600;
	#seconds_per_min = 60;

	#Multiplier = new Map([
		['Y', 1000**8],
		['Z', 1000**7],
		['E', 1000**6],
		['P', 1000**5],
		['T', 1000**4],
		['G', 1000**3],
		['M', 1000**2],
		['K', 1000],
		['B', 1]
	]);

	#BMultiplier = new Map([
		['Y', 1024**8],
		['Z', 1024**7],
		['E', 1024**6],
		['P', 1024**5],
		['T', 1024**4],
		['G', 1024**3],
		['M', 1024**2],
		['K', 1024],
		['B', 1]
	]);

	#sMultiplier = new Map([
		['y', 86400 * 365],
		['M', 86400 * 30],
		['d', 86400],
		['h', 3600],
		['m', 60],
		['s', 1],
		['ms', 0.001]
	]);

	#overrideMapping = {
		lmin: ['lefty_min', 'left_y_min_js_override'],
		lmax: ['lefty_max', 'left_y_max_js_override'],
		rmin: ['righty_min', 'right_y_min_js_override'],
		rmax: ['righty_max', 'right_y_max_js_override']
	}

	#theme = 'dark-theme';
	#aggOverrideActive = 'original';

	onInitialize() {
		this._has_contents = false;
		this._svg_options = {};
		this._selected_metrics = new Set();
		this.initMetricOverrides();
		this._legend_sort = null;
		this._legend_tooltip_id = null;
		this._currentScrollTop = 0;
		this._initialOverrides = {};
		this.setLastYAxis();
	}

	initMetricOverrides() {
		this._selected_metric_overrides = {
			lunits: null,
			lmin: null,
			lmax: null,
			runits: null,
			rmin: null,
			rmax: null
		}
	}

	initMetricOverridesSide(side) {
		let prefix = 'l';
		if (side === CWidgetSvgGraphRME.AXIS_RIGHT) {
			prefix = 'r';
		}

		this._selected_metric_overrides[`${prefix}units`] = null;
		this._selected_metric_overrides[`${prefix}min`] = null;
		this._selected_metric_overrides[`${prefix}max`] = null;
	}

	setLastYAxis() {
		this._lastYAxisValues = {
			lastlymax: null,
			lastlymmin: null,
			lastrymax: null,
			lastrymin: null
		}
	}

	onActivate() {
		this._activateGraph();
	}

	onDeactivate() {
		this._deactivateGraph();
	}

	onResize() {
		if (this._state === WIDGET_STATE_ACTIVE) {
			this._startUpdating();
		}
	}

	onFeedback({type, value}) {
		if (type === CWidgetsData.DATA_TYPE_TIME_PERIOD && this.getFieldsReferredData().has('time_period')) {
			this._startUpdating();

			this.feedback({time_period: value});

			return true;
		}

		return false;
	}

	getTheme() {
		this.#theme = jQuery('html').attr('theme');
	}

	promiseUpdate() {
		const time_period = this.getFieldsData().time_period;

		if (!this.hasBroadcast(CWidgetsData.DATA_TYPE_TIME_PERIOD) || this.isFieldsReferredDataUpdated('time_period')) {
			this.broadcast({
				[CWidgetsData.DATA_TYPE_TIME_PERIOD]: time_period
			});
		}

		return super.promiseUpdate();
	}

	adjustMinMax(min, max) {
		if (min === max) {
			if (min === '0') {
				max = '1.1';
			}
			else {
				min = String(parseFloat(min) - 1);
				max = String(parseFloat(max) + 1);
			}
		}
		return { min, max };
	}

	getUpdateRequestData() {
		const request_data = super.getUpdateRequestData();
		for (let i = 0; i < request_data.fields.ds.length; i++) {
			if (request_data.fields.ds[i]['override_hostid'][0] === '000000') {
				request_data.fields.ds[i]['override_hostid'] = [];
			}
		}

		if (this._selected_metrics.size > 0) {
			for (const [overrideKey, [mainFieldKey, overrideFieldKey]] of Object.entries(this.#overrideMapping)) {
				const overrideVal = this._selected_metric_overrides[overrideKey];
				const currentVal = request_data.fields[mainFieldKey];

				if (overrideVal === null) continue;
				if (currentVal !== '') continue;

				if (mainFieldKey.includes('max')) {
					request_data.fields[overrideFieldKey] = String(overrideVal * CWidgetSvgGraphRME.MAX_MULTIPLIER);
				}
				else {
					request_data.fields[overrideFieldKey] = String(overrideVal * CWidgetSvgGraphRME.MIN_MULTIPLIER);
				}
			}

			if (this._selected_metric_overrides.lunits !== null) {
				request_data.fields.left_y_units_js_override = this._selected_metric_overrides.lunits;
			}

			if (this._selected_metric_overrides.runits !== null) {
				request_data.fields.right_y_units_js_override = this._selected_metric_overrides.runits;
			}

			const lefty = this.adjustMinMax(request_data.fields.left_y_min_js_override, request_data.fields.left_y_max_js_override);
			if (!isNaN(lefty.min) && !isNaN(lefty.max)) {
				request_data.fields.left_y_min_js_override = lefty.min;
				request_data.fields.left_y_max_js_override = lefty.max;
				this._lastYAxisValues.lastlymin = request_data.fields.left_y_min_js_override;
				this._lastYAxisValues.lastlymax = request_data.fields.left_y_max_js_override;
			}

			const righty = this.adjustMinMax(request_data.fields.right_y_min_js_override, request_data.fields.right_y_max_js_override);
			if (!isNaN(righty.min) && !isNaN(righty.max)) {
				request_data.fields.right_y_min_js_override = righty.min;
				request_data.fields.right_y_max_js_override = righty.max;
				this._lastYAxisValues.lastrymin = request_data.fields.right_y_min_js_override;
				this._lastYAxisValues.lastrymax = request_data.fields.right_y_max_js_override;
			}

			request_data.fields.lines_hidden_js_override = [...this.hiddenLines.keys()];
		}

		const overrides = {
			min:  { grouping: CWidgetSvgGraphRME.AGGREGATE_GROUPING_DATASET, interval: '10m', fn: '1',   prefix: 'Minimum: ' },
			max:  { grouping: CWidgetSvgGraphRME.AGGREGATE_GROUPING_DATASET, interval: '10m', fn: '2',   prefix: 'Maximum: ' },
			avg:  { grouping: CWidgetSvgGraphRME.AGGREGATE_GROUPING_DATASET, interval: '10m', fn: '3',   prefix: 'Average: ' },
			sum:  { grouping: CWidgetSvgGraphRME.AGGREGATE_GROUPING_DATASET, interval: '10m', fn: '100', prefix: 'Sum: ' },
			each: { grouping: CWidgetSvgGraphRME.AGGREGATE_GROUPING_EACH_ITEM, interval: '10m', fn: '0', prefix: '' }
		};

		for (let i = 0; i < request_data.fields.ds.length; i++) {
			const ds = i + 1;
			const baseLabel = this._fields.ds[i]['data_set_label'] || 'Dataset #' + ds;

			if (this.#aggOverrideActive === 'original') {
				request_data.fields.ds[i]['aggregate_grouping'] = this._fields.ds[i]['aggregate_grouping'];
				request_data.fields.ds[i]['aggregate_interval'] = this._fields.ds[i]['aggregate_interval'];
				request_data.fields.ds[i]['aggregate_function'] = this._fields.ds[i]['aggregate_function'];
				request_data.fields.ds[i]['data_set_label']     = this._fields.ds[i]['data_set_label'];
			}
			else if (overrides[this.#aggOverrideActive]) {
				const { grouping, interval, fn, prefix } = overrides[this.#aggOverrideActive];
				request_data.fields.ds[i]['aggregate_grouping'] = grouping;
				request_data.fields.ds[i]['aggregate_interval'] = interval;
				request_data.fields.ds[i]['aggregate_function'] = fn;
				request_data.fields.ds[i]['data_set_label']     = prefix ? prefix + baseLabel : '';
			}
		}

		for (const [dataset_key, dataset] of request_data.fields.ds.entries()) {
			if (dataset.dataset_type != CWidgetSvgGraphRME.DATASET_TYPE_SINGLE_ITEM) {
				continue;
			}

			const dataset_new = {
				...dataset,
				itemids: [],
				color: []
			};

			for (const [item_index, itemid] of dataset.itemids.entries()) {
				if (Array.isArray(itemid)) {
					if (itemid.length === 1) {
						dataset_new.itemids.push(itemid[0]);
						dataset_new.color.push(dataset.color[item_index]);
					}
				}
				else {
					dataset_new.itemids.push(itemid);
					dataset_new.color.push(dataset.color[item_index]);
				}
			}

			request_data.fields.ds[dataset_key] = dataset_new;
		}

		if (!this.getFieldsReferredData().has('time_period')) {
			request_data.has_custom_time_period = 1;
		}

		return request_data;
	}

	processUpdateResponse(response) {
		this.clearContents();

		super.processUpdateResponse(response);

		this.getTheme();
		this._addGraphDisplayMenu();
		this._setupScrollListener();
		this._scrollToLastPosition();

		if (response.svg_options !== undefined) {
			this._has_contents = true;

			this._initGraph({
				sbox: false,
				show_problems: true,
				show_simple_triggers: true,
				hint_max_rows: 20,
				min_period: 60,
				...response.svg_options.data
			});
		}
		else {
			this._has_contents = false;
		}
	}

	onClearContents() {
		if (this._has_contents) {
			this._deactivateGraph();

			this._has_contents = false;
		}
	}

	_areAllValuesNull(obj) {
		for (let key in obj) {
			if (obj[key] !== null) {
				return false;
			}
		}
		return true;
	}

	_initGraph(options) {
		this._svg_options = options;
		this._svg = this._body.querySelector('svg');
		this._svg.style.display = 'none';
		jQuery(this._svg).svggraphrme(this);

		this._activateGraph();
		this.legendItems = this._body.querySelectorAll('.svg-graph-legend-item');

		if (Object.keys(this._initialOverrides).length === 0 || this._areAllValuesNull(this._initialOverrides)) {
			const initialValues = new Set(
				Array.from(this.legendItems).map(l => l.textContent)
			);

			let rawValues = {};
			initialValues.forEach(value => {
				rawValues = this._getValuesAndUnitsForMetric(rawValues, value, false, true);
			});
			this._initialOverrides = {...this._selected_metric_overrides};
		}

		const completeRefresh = this._setupLegendClickHandlers();
		if (!completeRefresh) {
			this._svg.style.display = '';
		}
		else {
			const legendContainer = this._body.querySelector('.svg-graph-legend');
			legendContainer.style.display = 'none';
		}
	}

	_activateGraph() {
		if (this._has_contents) {
			jQuery(this._svg).svggraphrme('activate');
		}
	}

	_deactivateGraph() {
		if (this._has_contents) {
			jQuery(this._svg).svggraphrme('deactivate');
		}
	}

	_addGraphDisplayMenu() {
		const widgetHeader = this._container.querySelector('.dashboard-grid-widget-header');

		if (widgetHeader.querySelector('.graph-display-trigger')) {
			return;
		}

		const trigger = document.createElement('button');
		trigger.type = 'button';
		trigger.className = 'graph-display-trigger';

		let color = '#fff';
		let backgroundColor = '#1e1e1e';
		let border = '#383838';

		switch (this.#theme) {
			case 'blue-theme':
			case 'hc-light':
				backgroundColor = 'white';
				color = 'black';
				border = '#ccd5d9';
				break;
		}

		const tooltip = document.createElement('div');
		tooltip.className = 'custom-tooltip';
		tooltip.style.position = 'absolute';
		tooltip.style.padding = '4px 8px';
		tooltip.style.background = backgroundColor;
		tooltip.style.color = color;
		tooltip.style.border = `1px solid ${border}`;
		tooltip.style.borderRadius = '3px';
		tooltip.style.fontSize = '12px';
		tooltip.style.pointerEvents = 'none';
		tooltip.style.opacity = '0';
		document.body.appendChild(tooltip);

		trigger.addEventListener('mouseenter', (e) => {
			tooltip.style.opacity = '1';
			this._showTooltip(
				t('Change how metrics are aggregated in the graph'),
				e,
				tooltip
			);
		});

		trigger.addEventListener('mousemove', (e) => {
			tooltip.style.opacity = '0';
			this._showTooltip(
				t('Change how metrics are aggregated in the graph'),
				e,
				tooltip
			);
		});

		trigger.addEventListener('mouseleave', () => {
			tooltip.style.opacity = '0';
		});

		trigger.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
				viewBox="0 0 24 24" fill="none" stroke="currentColor"
				stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
				<line x1="4" y1="6" x2="20" y2="6"/>
				<line x1="4" y1="12" x2="16" y2="12"/>
				<line x1="4" y1="18" x2="12" y2="18"/>
			</svg>
		`;

		trigger.addEventListener('click', (e) => {
			e.stopPropagation();
			this._toggleGraphDisplayMenu(trigger);
		});

		const widgetTitle = widgetHeader.querySelector('h4');
		widgetHeader.insertBefore(trigger, widgetTitle.nextSibling);
	}

	_toggleGraphDisplayMenu(trigger) {
		if (this._graphDisplayMenu) {
			this._graphDisplayMenu.remove();
			if (this._graphDisplayMenuCloseHandler) {
				document.removeEventListener('click', this._graphDisplayMenuCloseHandler);
				this._graphDisplayMenuCloseHandler = null;
			}

			if (this._graphDisplayMenuRepositionHandler) {
				window.removeEventListener('scroll', this._graphDisplayMenuRepositionHandler, true);
				window.removeEventListener('resize', this._graphDisplayMenuRepositionHandler, true);
				this._graphDisplayMenuRepositionHandler = null;
			}

			if (this._graphDisplayMenuRafId) {
				cancelAnimationFrame(this._graphDisplayMenuRafId);
				this._graphDisplayMenuRafId = null;
			}

			this._graphDisplayMenu = null;
			return;
		}

		const menu = document.createElement('ul');
		menu.className = 'graph-display-menu';
		menu.style.position = 'fixed';
		menu.style.zIndex = '100000';
		this._graphDisplayMenu = menu;

		const viewOptions = [
			{ value: 'original', label: 'Default view', tooltip: 'Shows the original metrics as they were configured in the widget' },
			{ value: 'sum', label: 'Aggregate sum', tooltip: 'Sums all the metrics' },
			{ value: 'avg', label: 'Aggregate avg', tooltip: 'Averages all metrics' },
			{ value: 'min', label: 'Aggregate min', tooltip: 'Displays the minimum of all metrics' },
			{ value: 'max', label: 'Aggregate max', tooltip: 'Displays the maximum of all metrics' },
			{ value: 'each', label: 'Each metric', tooltip: 'Displays each metric individually, showing the host and metric name' }
		];

		viewOptions.forEach(opt => {
			const li = document.createElement('li');
			li.textContent = opt.label;
			if (this.#aggOverrideActive === opt.value) li.classList.add('selected');
			if (opt.tooltip) li.title = opt.tooltip;

			li.addEventListener('click', (e) => {
				e.stopPropagation();
				this.#aggOverrideActive = opt.value;
				this._startUpdating();

				if (this.#aggOverrideActive !== 'original') {
					trigger.classList.add('active');
				}
				else {
					trigger.classList.remove('active');
				}

				menu.remove();
				if (this._graphDisplayMenuCloseHandler) {
					document.removeEventListener('click', this._graphDisplayMenuCloseHandler);
					this._graphDisplayMenuCloseHandler = null;
				}

				if (this._graphDisplayMenuRepositionHandler) {
					window.removeEventListener('scroll', this._graphDisplayMenuRepositionHandler, true);
					window.removeEventListener('resize', this._graphDisplayMenuRepositionHandler, true);
					this._graphDisplayMenuRepositionHandler = null;
				}

				if (this._graphDisplayMenuRafId) {
					cancelAnimationFrame(this._graphDisplayMenuRafId);
					this._graphDisplayMenuRafId = null;
				}

				this._graphDisplayMenu = null;
			});

			menu.appendChild(li);
		});

		const placeMenu = () => {
			const rect = trigger.getBoundingClientRect();
			menu.style.top = `${Math.round(rect.bottom)}px`;
			menu.style.left = `${Math.round(rect.left)}px`;
			const mRect = menu.getBoundingClientRect();
			if (mRect.right > window.innerWidth) {
				const shift = mRect.right - window.innerWidth + 8; // 8px padding
				menu.style.left = `${Math.max(8, Math.round(rect.left - shift))}px`;
			}

			if (mRect.bottom > window.innerHeight) {
				const altTop = rect.top - mRect.height;
				if (altTop > 8) menu.style.top = `${Math.round(altTop)}px`;
			}
		};

		const rafPlace = () => {
			if (this._graphDisplayMenuRafId) cancelAnimationFrame(this._graphDisplayMenuRafId);
			this._graphDisplayMenuRafId = requestAnimationFrame(() => {
				placeMenu();
				this._graphDisplayMenuRafId = null;
			});
		};

		this._graphDisplayMenuRepositionHandler = () => {
			rafPlace();
		};

		window.addEventListener('scroll', this._graphDisplayMenuRepositionHandler, true);
		window.addEventListener('resize', this._graphDisplayMenuRepositionHandler, true);

		this._graphDisplayMenuCloseHandler = (e) => {
			if (!menu.contains(e.target) && e.target !== trigger) {
				menu.remove();
				document.removeEventListener('click', this._graphDisplayMenuCloseHandler);
				this._graphDisplayMenuCloseHandler = null;

				if (this._graphDisplayMenuRepositionHandler) {
					window.removeEventListener('scroll', this._graphDisplayMenuRepositionHandler, true);
					window.removeEventListener('resize', this._graphDisplayMenuRepositionHandler, true);
					this._graphDisplayMenuRepositionHandler = null;
				}

				if (this._graphDisplayMenuRafId) {
					cancelAnimationFrame(this._graphDisplayMenuRafId);
					this._graphDisplayMenuRafId = null;
				}

				this._graphDisplayMenu = null;
			}
		};
		document.addEventListener('click', this._graphDisplayMenuCloseHandler);

		document.body.appendChild(menu);
		placeMenu();
	}

	getActionsContextMenu({can_copy_widget, can_paste_widget}) {
		const menu = super.getActionsContextMenu({can_copy_widget, can_paste_widget});

		if (this.isEditMode()) {
			return menu;
		}

		let menu_actions = null;

		for (const search_menu_actions of menu) {
			if ('label' in search_menu_actions && search_menu_actions.label === t('Actions')) {
				menu_actions = search_menu_actions;

				break;
			}
		}

		if (menu_actions === null) {
			menu_actions = {
				label: t('Actions'),
				items: []
			};

			menu.unshift(menu_actions);
		}

		menu_actions.items.push({
			label: t('Download image'),
			disabled: !this._has_contents,
			clickCallback: () => {
				downloadSvgImage(this._svg, 'image.png', '.svg-graph-legend');
			}
		});

		return menu;
	}

	hasPadding() {
		return true;
	}

	_setupLegendClickHandlers() {
		this.hiddenLines = new Map();

		const tooltip = this._addAddlGraphStyling();

		const restoreAllLines = () => {
			this.hiddenLines.clear();
			this._selected_metrics.clear();
			this.initMetricOverrides();
			this._initialOverrides = {};
		};

		this.legendItems.forEach(item => {
			const span = item.querySelector('span');
			const metric = span.textContent;

			this._addLegendHoverHandlers(item, span, metric, tooltip);

			item.addEventListener('click', () => {
				if (event.ctrlKey) {
					if (this._selected_metrics.size > 0) {
						if (this._selected_metrics.has(metric)) {
							this._unSelectMetric(item, metric);
						}
						else {
							this._selectMetric(item, metric);
						}
					}
					else {
						if (this.hiddenLines.size === this.legendItems.length) {
							this._selectMetric(item, metric);
						}
						else {
							const allGraphElements = this._getAllGraphElements();
							this._selected_metrics = new Set(
								Array.from(this.legendItems).map(l => l.textContent)
							);
							this._selected_metrics.delete(metric);
							this._removeLine(allGraphElements, false, true);
							this._setLegendOpacity();
						}
					}

					const previousSelectedMetricOverrides = {...this._selected_metric_overrides};

					if (this._selected_metrics.size > 0) {
						let hasMixedUnits = false;
						if (this._selected_metrics.size > 1) {
							hasMixedUnits = this._hasMixedUnits();
						}

						let rawValues = {};
						this._selected_metrics.forEach(selectedMetric => {
							rawValues = this._getValuesAndUnitsForMetric(rawValues, selectedMetric, hasMixedUnits);
						});
					}

					for (const sMetric of this._selected_metrics) {
						const graphLine = this._getGraphLine(sMetric);
						if (graphLine) {
							if (this._shouldUpdate(graphLine, previousSelectedMetricOverrides)) {
								this._startUpdating();
								return;
							}
							else {
								graphLine.style.display = '';
							}
						}
					}

					this.hiddenLines.forEach(g => {
						if (this._svg.contains(g)) {
							this._svg.removeChild(g);
						}
					});

					return;
				}

				if (this._selected_metrics.has(metric)) {
					if (this._selected_metrics.size > 1) {
						this._showOnly(metric);
					}
					else {
						this._selected_metrics.clear();
						if (this._fields.ds.some(obj => obj.stacked === '1')) {
							this._selected_metric_overrides = {...this._initialOverrides};
							this._startUpdating();
							return;
						}

						const graphLine = this._getGraphLine(metric);
						this.hiddenLines.set(metric, graphLine);

						this.hiddenLines.forEach((g, m) => {
							if (g != null) {
								g.style.display = 'none';
								this._svg.appendChild(g);
							}
						});

						const clonedHiddenLines = new Map(this.hiddenLines);

						this.hiddenLines.clear();
						this._setLegendOpacity(true);

						if (!this._overridesEqualityCheck(this._selected_metric_overrides, this._initialOverrides)) {
							this._selected_metric_overrides = {...this._initialOverrides};
							this._startUpdating();
						}
						else {
							clonedHiddenLines.forEach(g => {
								if (g != null) {
									g.style.display = '';
								}
							});
							this._selected_metric_overrides = {...this._initialOverrides};
						}
					}
				}
				else {
					this._showOnly(metric);
				}
			});
		});

		const legendMetrics = Array.from(this.legendItems).map(item => item.querySelector('span').textContent);

		if (this._selected_metrics.size > 0) {
			let hasMixedUnits = false;
			if (this._selected_metrics.size > 1) {
				hasMixedUnits = this._hasMixedUnits();
			}

			const stillValid = [...this._selected_metrics].some(metric => legendMetrics.includes(metric));

			if (!stillValid) {
				restoreAllLines();
				this._currentScrollTop = 0;
				this._scrollToLastPosition();
				this._startUpdating();
				return true;
			}
			else {
				const prevLUnits = this._selected_metric_overrides.lunits;
				const prevRUnits = this._selected_metric_overrides.runits;
				const prevLMax = this._selected_metric_overrides.lmax;
				const prevRMax = this._selected_metric_overrides.rmax;
				const prevLMin = this._selected_metric_overrides.lmin;
				const prevRMin = this._selected_metric_overrides.rmin;

				let rawValues = {};
				this._selected_metrics.forEach(selectedMetric => {
					rawValues = this._getValuesAndUnitsForMetric(rawValues, selectedMetric, hasMixedUnits);
				});

				const lChanged = (
					prevLUnits !== this._selected_metric_overrides.lunits ||
					prevLMax !== this._selected_metric_overrides.lmax ||
					prevLMin !== this._selected_metric_overrides.lmin
				);

				const rChanged = (
					prevRUnits !== this._selected_metric_overrides.runits ||
					prevRMax !== this._selected_metric_overrides.rmax ||
					prevRMin !== this._selected_metric_overrides.rmin
				);

				if (lChanged || rChanged) {
					this._setLegendOpacity();
					this._startUpdating();
					return true;
				}
				else {
					this._selected_metric_overrides.lunits = prevLUnits;
					this._selected_metric_overrides.runits = prevRUnits;
					this._selected_metric_overrides.lmax = prevLMax;
					this._selected_metric_overrides.rmax = prevRMax;
					this._selected_metric_overrides.lmin = prevLMin;
					this._selected_metric_overrides.rmin = prevRMin;

					this._removeLine(this._getAllGraphElements());
					this._setLegendOpacity();
				}
			}
		}

		this._setupLegendSorting();
		return false;
	}

	_setupScrollListener() {
		const legendContainer = this._body.querySelector('.svg-graph-legend');
		if (legendContainer) {
			legendContainer.addEventListener('scroll', () => {
				this._currentScrollTop = legendContainer.scrollTop;
			});
		}
	}

	_overridesEqualityCheck(a, b) {
		if (a === b) return true;

		if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') {
			return false;
		}

		const keysA = Object.keys(a);
		const keysB = Object.keys(b);

		if (keysA.length !== keysB.length) return false;

		for (const key of keysA) {
			if (!keysB.includes(key) || !this._overridesEqualityCheck(a[key], b[key])) {
				return false;
			}
		}

		return true;
	}

	_hasMixedUnits() {
		let units = new Set();
		for (const metric of this._selected_metrics) {
			const graphLine = this._getGraphLine(metric);
			units.add(graphLine?.getAttribute('data-units'));
		}
		return units.size > 1;
	}

	_shouldUpdate(graphLine, prev) {
		if (this._fields.ds.some(obj => obj.stacked === '1')) return true;
		const isLeft = graphLine.getAttribute('data-axisy') === CWidgetSvgGraphRME.AXIS_LEFT;
		const prefix = isLeft ? 'l' : 'r';
		const minKey = isLeft ? 'lefty_min' : 'righty_min';
		const maxKey = isLeft ? 'lefty_max' : 'righty_max';

		if (this._fields[minKey] === '' || this._fields[maxKey] === '') {
			const getValue = (key, overrideKey) =>
				this._fields[key] === ''
					? this._selected_metric_overrides[overrideKey]
					: parseFloat(this._fields[key]);

			const getPrevValue = (key, prevKey) =>
				this._fields[key] === ''
					? prev[prevKey]
					: parseFloat(this._fields[key]);

			const prevMin = getPrevValue(minKey, `${prefix}min`);
			const prevMax = getPrevValue(maxKey, `${prefix}max`);
			const currMin = getValue(minKey, `${prefix}min`);
			const currMax = getValue(maxKey, `${prefix}min`);

			if (currMin == null && currMax == null) return false;
			if (prevMin == null || prevMax == null || currMin == null || currMax == null) return true;

			const maxChanged = currMax < prevMax * CWidgetSvgGraphRME.MIN_MULTIPLIER || prevMax * CWidgetSvgGraphRME.MAX_MULTIPLIER < currMax;
			const minChanged = currMin > prevMin * CWidgetSvgGraphRME.MIN_MULTIPLIER || prevMin * CWidgetSvgGraphRME.MIN_MULTIPLIER > currMin;

			if (this._lastYAxisValues[`last${prefix}ymax`] !== null && this._fields[maxKey] === '') {
				if (currMax > parseFloat(this._lastYAxisValues[`last${prefix}ymax`])) {
					return true;
				}
			}

			if (this._lastYAxisValues[`last${prefix}ymin`] !== null && this._fields[minKey] === '') {
				if (currMin < parseFloat(this._lastYAxisValues[`last${prefix}ymin`])) {
					return true;
				}
			}

			return maxChanged || minChanged;
		}

		return false;
	}

	_showOnly(metric) {
		this.hiddenLines.forEach((g) => {
			this._svg.appendChild(g);
			g.style.display = 'none';
		});
		this.hiddenLines.clear();

		const previousSelectedMetricOverrides = {...this._selected_metric_overrides};

		this._selected_metrics.clear();
		this._selected_metrics.add(metric);

		const graphLine = this._getGraphLine(metric);
		this._removeLine(this._getAllGraphElements(), true);

		this._getValuesAndUnitsForSelection(metric);

		if (graphLine) {
			if (this._shouldUpdate(graphLine, previousSelectedMetricOverrides)) {
				this._startUpdating();
			}
			else {
				graphLine.style.display = '';
				this._setLegendOpacity();
			}
		}
		else {
			this._setLegendOpacity();
		}
	}

	_setLegendOpacity(activateAll = false) {
		this.legendItems.forEach(item => {
			if (activateAll) {
				item.style.opacity = '1';
			}
			else {
				const metric = item.querySelector('span')?.textContent;
				item.style.opacity = this._selected_metrics.has(metric) ? '1' : '0.4';
			}
		});
	}

	_getGraphLine(metric) {
		const correctedMetric = metric
			.replace(/\\/g, '\\\\')
			.replace(/([\n\r\t\f\v])/g, ' ')
			.replace(/"/g, '\\"');

		return this._svg.querySelector(`g[data-metric="${correctedMetric}"]`);
	}

	_getAllGraphElements() {
		return this._svg.querySelectorAll(
			'g[data-set="line"], g[data-set="bar"], g[data-set="points"], g[data-set="staircase"]'
		);
	}

	_unSelectMetric(item, metric) {
		this._selected_metrics.delete(metric);
		const graphLine = this._getGraphLine(metric);
		if (graphLine) {
			this.hiddenLines.set(metric, graphLine);
		}
		item.style.opacity = '0.4';
	}

	_selectMetric(item, metric) {
		this._selected_metrics.add(metric);
		const hidden = this.hiddenLines.get(metric);
		if (hidden) {
			this._svg.appendChild(hidden);
			hidden.style.display = 'none';
			this.hiddenLines.delete(metric);
		}

		const allGraphElements = this._getAllGraphElements();

		const arrayAllGraphElements = Array.from(allGraphElements);
		arrayAllGraphElements.sort((a, b) => {
			const indexA = parseInt(a.getAttribute('data-index'), 10);
			const indexB = parseInt(b.getAttribute('data-index'), 10);
			return indexA - indexB;
		});

		allGraphElements.forEach(g => {
			g.remove();
		});

		arrayAllGraphElements.forEach((g, index) => {
			this._svg.appendChild(g);
		});

		item.style.opacity = '1';
	}

	_removeLine(allGraphElements, addBack = false, frominitial = false) {
		allGraphElements.forEach(g => {
			const gMetric = g.getAttribute('data-metric');
			if (!this._selected_metrics.has(gMetric)) {
				this.hiddenLines.set(gMetric, g);
				if (this._fields.ds[g.getAttribute('data-index')].stacked && frominitial) {
				}
				else {
					g.remove();
				}
			}
			else {
				if (addBack) {
					if (!this._fields.ds[g.getAttribute('data-index')].stacked) {
						g.style.display = 'none';
					}
					else {
						g.style.display = 'none';
					}
				}
			}
		});
	}

	_scrollToLastPosition() {
		const legendContainer = this._body.querySelector('.svg-graph-legend');
		if (!legendContainer) return;

		legendContainer.scrollTop = this._currentScrollTop;
	}

	_getValuesAndUnitsForSelection(metric) {
		let rawValues = {};
		rawValues = this._getValuesAndUnitsForMetric(rawValues, metric);
	}

	_getValuesAndUnitsForMetric(rawValues, metric, hasMixedUnits = false, initial = false) {
		const graphLine = this._getGraphLine(metric);
		if (!graphLine) return rawValues;
		if (!initial && this._fields.ds[graphLine.getAttribute('data-index')].stacked) {
			this.initMetricOverridesSide(graphLine.getAttribute('data-axisy'));
			return rawValues;
		}

		const axis = (graphLine.getAttribute('data-axisy') || CWidgetSvgGraphRME.AXIS_LEFT) === CWidgetSvgGraphRME.AXIS_LEFT
			? 'left'
			: 'right';

		if (hasMixedUnits) {
			this._selected_metric_overrides[axis === 'left' ? 'lunits' : 'runits'] = '';
		}
		else {
			this._selected_metric_overrides[axis === 'left' ? 'lunits' : 'runits'] = graphLine.getAttribute('data-units') || '';
		}

		const labeledElements = graphLine.querySelectorAll('[label]');
		labeledElements.forEach(el => {
			const label = el.getAttribute('label');
			if (label) {
				if (!rawValues[axis]) {
					rawValues[axis] = [...label.split(',').map(s => s.trim())];
				}
				else {
					rawValues[axis].push(...label.split(',').map(s => s.trim()));
				}
			}
		});

		for (const key in rawValues) {
			let rv = rawValues[key];
			if (key === 'left') {
				const newValues = rv.map(x => this._getNumValue(x, this._selected_metric_overrides.lunits));
				this._selected_metric_overrides.lmax = (this._fields.lefty_max !== '')
					? parseFloat(this._fields.lefty_max)
					: Math.max(...newValues);
				this._selected_metric_overrides.lmin = (this._fields.lefty_min !== '')
					? parseFloat(this._fields.lefty_min)
					: Math.min(...newValues);
			}
			else {
				const newValues = rv.map(x => this._getNumValue(x, this._selected_metric_overrides.runits));
				this._selected_metric_overrides.rmax = (this._fields.righty_max !== '')
					? parseFloat(this._fields.righty_max)
					: Math.max(...newValues);
				this._selected_metric_overrides.rmin = (this._fields.righty_min !== '')
					? parseFloat(this._fields.righty_min)
					: Math.min(...newValues);
			}
		}

		return rawValues;
	}

	_addAddlGraphStyling() {
		if ($('style.custom-graph-styles').length === 0) {
			const customGraphStyle = document.createElement('style');
			customGraphStyle.classList.add('custom-graph-styles');
			customGraphStyle.textContent = `
				.svg-graph-legend-item {
					display: flex;
					align-items: center;
					gap: 6px;
				}
				.svg-graph-legend-item span {
					display: inline-block;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					max-width: 100%;
					flex: 1;
				}
				.graph-display-trigger {
					background: transparent;
					border: none;
					cursor: pointer;
					color: var(--graph-trigger-color);
					padding: 2px 4px;
					font-size: 14px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					padding-top: 4px;
				}
				.graph-display-trigger:hover {
					color: var(--graph-trigger-color);
					background: var(--hover-bg);
					border-radius: 2px;
				}
				.graph-display-trigger.active {
					color: #1f99e0;
				}
				.graph-display-menu {
					list-style: none;
					margin: 0;
					padding: 0;
					background: var(--menu-bg);
					border: 1px solid var(--menu-border);
					min-width: 140px;
					z-index: 10000;
				}
				.graph-display-menu li {
					padding: 4px 8px;
					cursor: pointer;
				}
				.graph-display-menu li:hover {
					background: #01579B;
					color: #fff;
				}
				.graph-display-menu li.selected {
					background-color: rgba(1, 87, 155, 0.3);
					font-weight: bold;
				}
				.custom-tooltip {
					pointer-events: none;
					transition: opacity 0.1s;
					z-index: 10000;
				}
			`;
			document.head.appendChild(customGraphStyle);
		}

		const tooltip = document.createElement('div');
		tooltip.id = this._svg.id + '-' + this._widgetid;

		let color = 'white';
		let backgroundColor = 'rgba(60, 60, 60, 0.95)';

		const root = document.documentElement;
		switch (this.#theme) {
			case 'blue-theme':
			case 'hc-light':
				backgroundColor = 'rgba(194, 194, 194, 0.95)';
				color = 'black';
				root.style.setProperty('--graph-trigger-color', '#646464');
				root.style.setProperty('--hover-bg', '#cacaca');
				root.style.setProperty('--menu-bg', '#fff');
				root.style.setProperty('--menu-border', '#ccd5d9');
				break;
			default:
				root.style.setProperty('--graph-trigger-color', '#c1c1c1');
				root.style.setProperty('--hover-bg', '#5c5c5c');
				root.style.setProperty('--menu-bg', '#1e1e1e');
				root.style.setProperty('--menu-border', '#383838');
				break;
		}

		Object.assign(tooltip.style, {
			position: 'absolute',
			backgroundColor: backgroundColor,
			color: color,
			padding: '6px 10px',
			borderRadius: '4px',
			fontSize: '13px',
			pointerEvents: 'none',
			whiteSpace: 'nowrap',
			zIndex: '1000',
			boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
			opacity: '0',
			transition: 'opacity 0.2s ease'
		});

		document.body.appendChild(tooltip);

		if (this._legend_tooltip_id !== null) {
			const oldTooltip = document.getElementById(this._legend_tooltip_id);
			if (oldTooltip) {
				oldTooltip.remove();
			}
		}

		this._legend_tooltip_id = tooltip.id;

		return tooltip;
	}

	_addLegendHoverHandlers(item, span, metric, tooltip) {
		const isTextTruncated = (el) => {
			return el.scrollWidth > el.clientWidth;
		};

		item.style.cursor = 'pointer';

		item.addEventListener('mouseover', (e) => {
			item.style.fontWeight = 'bold';
			switch (this.#theme) {
				case 'blue-theme':
				case 'hc-light':
					item.style.backgroundColor = '#c8c8c8';
					item.style.color = '#000';
					break;
				case 'dark-theme':
				case 'hc-dark':
				default:
					item.style.backgroundColor = '#525252';
					item.style.color = '#fff';
					break;
			}

			if (isTextTruncated(span)) {
				this._showTooltip(metric, e, tooltip);
			}
		});

		item.addEventListener('mousemove', (e) => {
			if (tooltip.style.opacity === '1') {
				this._showTooltip(metric, e, tooltip);
			}
		});

		item.addEventListener('mouseout', () => {
			item.style.backgroundColor = '';
			item.style.color = '';
			item.style.fontWeight = '';
			tooltip.style.opacity = '0';
		});
	}

	_showTooltip(text, event, tooltip) {
		const padding = 10;
		tooltip.textContent = text;
		tooltip.style.opacity = '1';
		tooltip.style.left = '-9999px';
		tooltip.style.top = '-9999px';
		const tooltipRect = tooltip.getBoundingClientRect();

		let left = event.pageX + padding;
		let top = event.pageY + padding;

		if (left + tooltipRect.width > window.innerWidth) {
			left = window.innerWidth - tooltipRect.width - padding;
		}

		if (top + tooltipRect.height > window.innerHeight) {
			top = window.innerHeight - tooltipRect.height - padding;
		}

		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	};

	_setupLegendSorting() {
		const legend = this._body.querySelector('.svg-graph-legend-statistic');
		if (!legend) return;

		const headers = Array.from(legend.querySelectorAll('.svg-graph-legend-header'));
		if (headers.length < 3) return;

		headers.forEach(header => {
			header.style.color = '#007bff';
			header.style.cursor = 'pointer';
			header.style.userSelect = 'none';
			header.style.position = 'relative';
			header.style.paddingRight = '15px';
		});

		headers.forEach(header => {
			const arrow = document.createElement('span');
			arrow.style.position = 'absolute';
			arrow.style.right = '2px';
			arrow.style.top = '50%';
			arrow.style.transform = 'translateY(-50%)';
			arrow.style.fontSize = '0.8em';
			arrow.style.userSelect = 'none';
			arrow.style.lineHeight = '0.8em';  // squish vertically
			arrow.style.display = 'flex';
			arrow.style.flexDirection = 'column';
			arrow.style.alignItems = 'center';
			arrow.style.color = '#999';
			arrow.innerHTML = '&#9650;<br>&#9660;';
			header.appendChild(arrow);
		});

		let currentSort = { colIndex: null, direction: 1 };
		
		const sortLegend = (colIndex, forceApply = false) => {
			if (!forceApply) {
				if (this._legend_sort?.colIndex === colIndex) {
					this._legend_sort.direction *= -1;
				}
				else {
					this._legend_sort = {
						colIndex: colIndex,
						direction: 1
					};
				}
			}
			else {
				this._legend_sort = this._legend_sort || {
					colIndex: colIndex,
					direction: 1
				};
			}

			const { colIndex: sortedCol, direction } = this._legend_sort;

			headers.forEach((header, i) => {
				const arrow = header.querySelector('span');
				if (i === sortedCol) {
					arrow.textContent = direction === 1
						? '\u25B2'
						: '\u25BC';
					arrow.style.color = '#007bff';
				}
				else {
					arrow.innerHTML = '&#9650;<br>&#9660;';
					arrow.style.color = '#999';
				}
			});

			const allDivs = Array.from(legend.children);
			const dataDivs = allDivs.slice(3);

			const groups = [];
			let i = 0;

			while (i < dataDivs.length) {
				const group = [];
				const itemDiv = dataDivs[i];

				if (!itemDiv.classList.contains('svg-graph-legend-item')) {
					break;
				}

				group.push(itemDiv);
				i++;

				while (i < dataDivs.length && !dataDivs[i].classList.contains('svg-graph-legend-item')) {
					group.push(dataDivs[i]);
					i++;
				}

				groups.push(group);
			}

			const isNoDataGroup = (group) => {
				return group.some(div => div.textContent.trim().toLowerCase() === '[no data]');
			};

			const noDataGroups = [];
			const dataGroups = [];

			groups.forEach(group => {
				if (isNoDataGroup(group)) {
					noDataGroups.push(group);
				}
				else {
					dataGroups.push(group);
				}
			});

			dataGroups.sort((a, b) => {
				const aText = a[sortedCol + 1]?.textContent ?? '';
				const bText = b[sortedCol + 1]?.textContent ?? '';

				const aVal = this._getNumValue(aText);
				const bVal = this._getNumValue(bText);

				if (aVal === null && bVal === null) return 0;
				if (aVal === null) return 1 * direction;
				if (bVal === null) return -1 * direction;

				return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * direction;
			});

			groups.forEach(group => {
				group.forEach(div => legend.removeChild(div));
			});

			dataGroups.forEach(group => {
				group.forEach(div => legend.appendChild(div));
			});

			noDataGroups.forEach(group => {
				group.forEach(div => legend.appendChild(div));
			});
		};

		headers.forEach((header, idx) => {
			header.addEventListener('click', () => {
				sortLegend(idx);
			});
		});

		if (this._legend_sort) {
			sortLegend(this._legend_sort.colIndex, true);
		}
	}

	_handleDateStr(x, regex) {
		var datematch = x.matchAll(regex);
		for (const match of datematch) {
			if (match.length > 0) {
				var epoch = new Date(match.input);
				return String(Math.floor(epoch.getTime() / 1000));
			}
		}

		return x;
        }

	_isUptime(x) {
		var uptime_reone = /^([0-9]+)\s*(days?,)\s*([0-9]{2}):([0-9]{2}):([0-9]{2})/g;
		var uptime_retwo = /^([0-9]{2}):([0-9]{2}):([0-9]{2})/g;
		var uptime_matchone = x.matchAll(uptime_reone);
		var uptime_matchtwo = x.matchAll(uptime_retwo);
		for (const match of uptime_matchone) {
			if (match.length > 0) {
				var days = parseInt(match[1]) * this.#seconds_per_day;
				var hours = parseInt(match[3]) * this.#seconds_per_hour;
				var mins = parseInt(match[4]) * this.#seconds_per_min;
				var uptime = days + hours + mins + parseInt(match[5]);
				return String(uptime);
			}
		}

		for (const match of uptime_matchtwo) {
			if (match.length > 0) {
				var hours = parseInt(match[1]) * this.#seconds_per_hour;
				var mins = parseInt(match[2]) * this.#seconds_per_min;
				var uptime = hours + mins + parseInt(match[3]);
				return String(uptime);
			}
		}

		return null;
	}

	_isUnixtime(x) {
		if (x == 'Never') {
			return '0';
		}
		
		var date_reone = /^(Mon|Tue|Wed|Thus|Fri|Sat|Sun)\s+([0-9]{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*([0-9]{4})/g;
		x = this._handleDateStr(x, date_reone);
		if (this._isNumeric(x)) {
			return x;
		}

		var date_retwo = /^([0-9]{4})-([0-9]{2})-([0-9]{2})\s{1,}([0-9]{2}):([0-9]{2}):([0-9]{2})\s*(AM|PM)?/g;
		x = this._handleDateStr(x, date_retwo);
		if (this._isNumeric(x)) {
			return x;
		}

		return null;
	}

	_isSeconds(x) {
		var s_reone = /^(\-?\d*\.?\d*E?\-?\d*)(ms|y|M|d|h|m|s)\s{0,}(\d*\.?\d*)(ms|y|M|d|h|m|s){0,1}\s{0,}(\d*\.?\d*)(ms|y|M|d|h|m|s){0,1}/g;
		var s_retwo = /^< 1 ms/g;
		var s_matchone = x.matchAll(s_reone);
		var s_matchtwo = x.matchAll(s_retwo);
		for (const match of s_matchone) {
			if (match.length > 0) {
				var one = parseFloat(match[1]) * this.#sMultiplier.get(match[2]);
				var two = 0;
				if (match[3] && match[4]) {
					var two = parseFloat(match[3]) * this.#sMultiplier.get(match[4]);
				}

				var three = 0;
				if (match[5] && match[6]) {
					var three = parseFloat(match[5]) * this.#sMultiplier.get(match[6]);
				}

				var s = one + two + three;
				return String(s);
			}
		}

		for (const match of s_matchtwo) {
			if (match.length > 0) {
				return '0';
			}
		}

		return null;
	}

	_isNumeric(x) {
		return !isNaN(parseFloat(x)) && isFinite(x);
        }

	_checkIfDate(x) {

		let value = x;

		value = this._isUptime(x);
		if (value !== null) return value;

		value = this._isUnixtime(x);
		if (value !== null) return value;

		value = this._isSeconds(x);
		if (value !== null) return value;

		return x;

        }

	_getNumValue(x, units = '') {
		let original_units = units;
		if (this._isNumeric(x)) {
			return parseFloat(x);
		}

		if (!units) {
			x = this._checkIfDate(x);
			if (this._isNumeric(x)) {
				return parseFloat(x);
			}
		}
		else {
			switch (units) {
				case 's':
					x = this._isSeconds(x);
					if (x !== null) return parseFloat(x);
					break;
				case 'uptime':
					x = this._isUptime(x);
					if (x !== null) return parseFloat(x);
					break;
				case 'unixtime':
					x = this._isUnixtime(x);
					if (x !== null) return parseFloat(x);
					break;
				default:
					units = '';
			}
		}

		if (x == '' || x == null) {
			return 0;
		}

		var splitx = x.split(' ');
		if (splitx.length == 2) {
			var numValue = splitx[0];
			if (!units) {
				var units_in_display = splitx[1];
			}
			else {
				var units_in_display = units;
			}

			if (this._isNumeric(numValue)) {
				if (units_in_display !== undefined) {
					if (original_units === 'B') {
						var multiplier = this.#BMultiplier.get(units_in_display.charAt(0));
					}
					else {
						var multiplier = this.#Multiplier.get(units_in_display.charAt(0));
					}

					if (multiplier) {
						return parseFloat(numValue) * multiplier;
					}

					return parseFloat(numValue);
				}
				
				return parseFloat(numValue);
			}

			return 0;
		}
		else {
			if (splitx.length == 1) {
				var numValue = splitx[0];
				if (this._isNumeric(numValue)) {
					return parseFloat(numValue);
				}
			}
		}

		return 0;

	}

}
