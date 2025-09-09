<?php declare(strict_types = 0);

namespace Modules\RMESvgGraph\Includes;

use CSvgGroup,
	CSvgCircle,
	CSvgPolygon,
	CSvgTag;

class RMECSvgGraphMetricsBar extends CSvgGroup {

	private const ZBX_STYLE_CLASS = 'svg-graph-bar';

	private $path;
	private $itemid;
	private $item_name;
	private $options;
	private $units;
	private $data_set;

	public function __construct(array $path, array $metric) {
		parent::__construct();

		$this->path = $path;

		$this->itemid = $metric['itemid'];
		$this->item_name = $metric['name'];
		$this->units = $metric['units'];
		$this->data_set = $metric['data_set'];

		$this->options = $metric['options'] + [
			'color' => RMECSvgGraph::SVG_GRAPH_DEFAULT_COLOR,
			'pointsize' => RMECSvgGraph::SVG_GRAPH_DEFAULT_POINTSIZE,
			'transparency' => RMECSvgGraph::SVG_GRAPH_DEFAULT_TRANSPARENCY,
			'width' => RMECSvgGraph::SVG_GRAPH_DEFAULT_LINE_WIDTH,
			'order' => 1
		];
	}

	public function makeStyles(): array {
		$this
			->addClass(self::ZBX_STYLE_CLASS)
			->addClass(self::ZBX_STYLE_CLASS.'-'.$this->itemid.'-'.$this->options['order']);

		return [
			'.'.self::ZBX_STYLE_CLASS.'-'.$this->itemid.'-'.$this->options['order'] => [
				'fill-opacity' => $this->options['transparency'] * 0.1,
				'fill' => $this->options['color']
			]
		];
	}

	private function draw(): void {
		$this->addItem(
			(new CSvgCircle(-10, -10, $this->options['width'] + 4))
				->addClass(CSvgTag::ZBX_STYLE_GRAPH_HIGHLIGHTED_VALUE)
		);

		foreach ($this->path as [$x1, $x2, $y1, $y2, $label, $tooltip_x]) {
			$this->addItem(
				(new CSvgPolygon(
					[[$x1, $y2], [$x2, $y2], [$x2, $y1], [$x1, $y1]]
				))
					->setAttribute('label', $label)
					->setAttribute('data-px', $tooltip_x)
			);
		}
	}

	public function toString($destroy = true): string {
		$this->setAttribute('data-set', 'bar')
			->setAttribute('data-metric', $this->item_name)
			->setAttribute('data-color', $this->options['color'])
			->setAttribute('data-units', $this->units)
			->setAttribute('data-index', $this->data_set)
			->setAttribute('data-axisy', $this->options['axisy'])
			->draw();

		return parent::toString($destroy);
	}
}
