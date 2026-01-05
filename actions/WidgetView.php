<?php declare(strict_types = 0);


namespace Modules\RMESvgGraph\Actions;

use CControllerDashboardWidgetView,
	CControllerResponseData,
	CNumberParser,
	CParser;

use Modules\RMESvgGraph\Includes\{
	RMECSvgGraphHelper,
	WidgetForm,
	CWidgetFieldDataSet
};

class WidgetView extends CControllerDashboardWidgetView {

	private const GRAPH_WIDTH_MIN = 1;
	private const GRAPH_WIDTH_MAX = 65535;
	private const GRAPH_HEIGHT_MIN = 1;
	private const GRAPH_HEIGHT_MAX = 65535;

	public const SVG_GRAPH_SUPPRESS_ZEROS_TRUE = 1;
	public const SVG_GRAPH_SUPPRESS_ZEROS_FALSE = 0;

	public const COLOR_BLIND_FRIENDLY_PALETTE = [
		'377EB8', 'FF7F00', '4DAF4A', 'F781BF', 'A65628', '984EA3',
		'999999', 'E41A1C', 'DEDE00', '17BECF', '8C564B', 'FFCC80',
		'66C2A5', 'FC8D62', '8DA0CB', 'E78AC3', 'A6D854', 'FFD92F',
		'E5C494', 'B3B3B3', '1B9E77', 'D95F02', '7570B3', 'E7298A'
	];

	protected function init(): void {
		parent::init();

		$this->addValidationRules([
			'contents_width' => 'int32|ge '.self::GRAPH_WIDTH_MIN.'|le '.self::GRAPH_WIDTH_MAX,
			'contents_height' => 'int32|ge '.self::GRAPH_HEIGHT_MIN.'|le '.self::GRAPH_HEIGHT_MAX,
			'has_custom_time_period' => 'in 1',
			'preview' => 'in 1'
		]);
	}

	protected function doAction(): void {
		$width = (int) $this->getInput('contents_width', self::GRAPH_WIDTH_MIN);
		$height = (int) $this->getInput('contents_height', self::GRAPH_HEIGHT_MIN);
		$has_custom_time_period = $this->hasInput('has_custom_time_period');
		$preview = $this->hasInput('preview'); // Configuration preview.

		$parser = new CNumberParser(['with_size_suffix' => true, 'with_time_suffix' => true]);

		$percentile_left_value = $parser->parse($this->fields_values['percentile_left_value']) == CParser::PARSE_SUCCESS
			? $parser->calcValue()
			: null;

		$percentile_right_value = $parser->parse($this->fields_values['percentile_right_value']) == CParser::PARSE_SUCCESS
			? $parser->calcValue()
			: null;

		$lefty_min = $parser->parse($this->fields_values['lefty_min']) == CParser::PARSE_SUCCESS
			? $parser->calcValue()
			: null;

		$lefty_max = $parser->parse($this->fields_values['lefty_max']) == CParser::PARSE_SUCCESS
			? $parser->calcValue()
			: null;

		$righty_min = $parser->parse($this->fields_values['righty_min']) == CParser::PARSE_SUCCESS
			? $parser->calcValue()
			: null;

		$righty_max = $parser->parse($this->fields_values['righty_max']) == CParser::PARSE_SUCCESS
			? $parser->calcValue()
			: null;

		$graph_data = [
			'data_sets' => array_values($this->fields_values['ds']),
			'data_source' => $this->fields_values['source'],
			'hintbox_sort' => $this->fields_values['hintbox_sort'],
			'fix_time_period' => ($this->isTemplateDashboard() && !$this->fields_values['override_hostid'])
				|| $has_custom_time_period,
			'displaying' => [
				'show_simple_triggers' => $this->fields_values['simple_triggers'] == SVG_GRAPH_SIMPLE_TRIGGERS_ON,
				'show_working_time' => $this->fields_values['working_time'] == SVG_GRAPH_WORKING_TIME_ON,
				'show_percentile_left' => $this->fields_values['percentile_left'] == SVG_GRAPH_PERCENTILE_LEFT_ON,
				'percentile_left_value' => $percentile_left_value,
				'show_percentile_right' => $this->fields_values['percentile_right'] == SVG_GRAPH_PERCENTILE_RIGHT_ON,
				'percentile_right_value' => $percentile_right_value,
				'show_suppress_zero_values' => $this->fields_values['suppress_zero_values'] == self::SVG_GRAPH_SUPPRESS_ZEROS_TRUE,
				'lines_hidden_js_override' => (array_key_exists('lines_hidden_js_override', $this->getInput('fields')))
					? $this->getInput('fields')['lines_hidden_js_override']
					: [],
				'left_y_units_js_override' => (array_key_exists('left_y_units_js_override', $this->getInput('fields')))
					? $this->getInput('fields')['left_y_units_js_override']
					: '',
				'right_y_units_js_override' => (array_key_exists('right_y_units_js_override', $this->getInput('fields')))
					? $this->getInput('fields')['right_y_units_js_override']
					: ''
			],
			'time_period' => [
				'time_from' => $this->fields_values['time_period']['from_ts'],
				'time_to' => $this->fields_values['time_period']['to_ts']
			],
			'axes' => [
				'show_left_y_axis' => $this->fields_values['lefty'] == SVG_GRAPH_AXIS_ON,
				'left_y_scale' => $this->fields_values['lefty_scale'],
				'left_y_min' => $lefty_min,
				'left_y_max' => $lefty_max,
				'left_y_units' => $this->fields_values['lefty_units'] == SVG_GRAPH_AXIS_UNITS_STATIC
					? $this->fields_values['lefty_static_units']
					: null,
				'show_right_y_axis' => $this->fields_values['righty'] == SVG_GRAPH_AXIS_ON,
				'right_y_scale' => $this->fields_values['righty_scale'],
				'right_y_min' => $righty_min,
				'right_y_max' => $righty_max,
				'right_y_units' => $this->fields_values['righty_units'] == SVG_GRAPH_AXIS_UNITS_STATIC
					? $this->fields_values['righty_static_units']
					: null,
				'show_x_axis' => $this->fields_values['axisx'] == SVG_GRAPH_AXIS_ON,
				'left_y_min_js_override' => (array_key_exists('left_y_min_js_override', $this->getInput('fields')))
					? $this->getInput('fields')['left_y_min_js_override']
					: '',
				'left_y_max_js_override' => (array_key_exists('left_y_max_js_override', $this->getInput('fields')))
					? $this->getInput('fields')['left_y_max_js_override']
					: '',
				'right_y_min_js_override' => (array_key_exists('right_y_min_js_override', $this->getInput('fields')))
					? $this->getInput('fields')['right_y_min_js_override']
					: '',
				'right_y_max_js_override' => (array_key_exists('right_y_max_js_override', $this->getInput('fields')))
					? $this->getInput('fields')['right_y_max_js_override']
					: ''
			],
			'legend' => [
				'show_legend' => $this->fields_values['legend'] == WidgetForm::LEGEND_ON,
				'legend_columns' => $this->fields_values['legend_columns'],
				'legend_lines' => $this->fields_values['legend_lines'],
				'legend_lines_mode' => $this->fields_values['legend_lines_mode'],
				'legend_statistic' => $this->fields_values['legend_statistic'],
				'show_aggregation' => $this->fields_values['legend_aggregation'] == WidgetForm::LEGEND_AGGREGATION_ON
			],
			'problems' => [
				'show_problems' => $this->fields_values['show_problems'] == SVG_GRAPH_PROBLEMS_ON,
				'graph_item_problems' => $this->fields_values['graph_item_problems'] == SVG_GRAPH_SELECTED_ITEM_PROBLEMS,
				'problemhosts' => $this->isTemplateDashboard() ? '' : $this->fields_values['problemhosts'],
				'severities' => $this->fields_values['severities'],
				'problem_name' => $this->fields_values['problem_name'],
				'evaltype' => $this->fields_values['evaltype'],
				'tags' => $this->fields_values['tags']
			],
			'overrides' => array_values($this->fields_values['or']),
			'templateid' => $this->getInput('templateid', ''),
			'override_hostid' => $this->fields_values['override_hostid']
				? $this->fields_values['override_hostid'][0]
				: ''
		];

		foreach ($graph_data['data_sets'] as &$ds) {
			if (!isset($ds['dataset_type']) || (int)$ds['dataset_type'] !== CWidgetFieldDataSet::DATASET_TYPE_SINGLE_ITEM) {
				continue;
			}

			$newItemids = [];
			$newColors = [];

			foreach ($ds['itemids'] as $index => $itemidEntry) {
				if (is_string($itemidEntry) && strpos($itemidEntry, '[') === 0) {
					$itemids = json_decode($itemidEntry, true);
					if (!is_array($itemids)) {
						continue;
					}

					$isSingleItem = (count($itemids) === 1);
					$fallbackColor = isset($ds['color'][$index]) ? $ds['color'][$index] : '';

					$colorIndex = 0;
					foreach ($itemids as $itemid) {
						$newItemids[] = $itemid['itemid'];

						if (isset($itemid['color']) && $itemid['color'] !== '') {
							// Has a non-empty color, use it
							$newColors[] = strtoupper($itemid['color']);
						}
						elseif (isset($itemid['color']) && $itemid['color'] === '' && $isSingleItem) {
							// Empty string with single item - use configured fallback
							$newColors[] = $fallbackColor;
						}
						elseif ($ds['aggregate_function'] == AGGREGATE_NONE) {
							$newColors[] = self::COLOR_BLIND_FRIENDLY_PALETTE[$colorIndex % count(self::COLOR_BLIND_FRIENDLY_PALETTE)];
							$colorIndex++;
						}
						else {
							// Empty string with multiple items, or missing color key - needs palette assignment
							$newColors[] = $itemid['color'];
						}
					}
				}
				else {
					$newItemids[] = $itemidEntry;
					$newColors[] = isset($ds['color'][$index]) ? $ds['color'][$index] : '';
				}
			}

			if (!empty($newItemids)) {
				$ds['itemids'] = $newItemids;
				$ds['color'] = $newColors;
			}
		}

		$svg_options = RMECSvgGraphHelper::get($graph_data, $width, $height);
		if ($svg_options['errors']) {
			error($svg_options['errors']);
		}

		if (!$preview) {
			$svg_options['data'] = zbx_array_merge($svg_options['data'], [
				'sbox' => (!$this->isTemplateDashboard() || $this->fields_values['override_hostid'])
					&& !$has_custom_time_period,
				'show_problems' => $graph_data['problems']['show_problems'],
				'show_simple_triggers' => $graph_data['displaying']['show_simple_triggers'],
				'hintbox_sort' => $graph_data['hintbox_sort'],
				'time_period' => $this->fields_values['time_period'],
				'hint_max_rows' => ZBX_WIDGET_ROWS
			]);
		}

		$this->setResponse(new CControllerResponseData([
			'name' => $this->getInput('name', $this->widget->getDefaultName()),
			'svg' => $svg_options['svg'].$svg_options['legend'],
			'svg_options' => $svg_options,
			'preview' => $preview,
			'info' => $this->makeWidgetInfo(),
			'user' => [
				'debug_mode' => $this->getDebugMode()
			]
		]));
	}

	/**
	 * Make widget specific info to show in widget's header.
	 */
	private function makeWidgetInfo(): array {
		$info = [];

		if ($this->hasInput('has_custom_time_period')) {
			$info[] = [
				'icon' => ZBX_ICON_TIME_PERIOD,
				'hint' => relativeDateToText($this->fields_values['time_period']['from'],
					$this->fields_values['time_period']['to']
				)
			];
		}

		return $info;
	}

}
