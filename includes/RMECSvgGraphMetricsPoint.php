<?php declare(strict_types = 0);

namespace Modules\RMESvgGraph\Includes;

use CSvgGroup,
	CSvgCircle,
	CSvgTag;


class RMECSvgGraphMetricsPoint extends CSvgGroup {

	/**
	 * Vertical position of points, which must be hidden, yet still rendered.
	 */
	public const Y_OUT_OF_RANGE = -10;

	private const ZBX_STYLE_CLASS = 'svg-graph-points';

	private $path;
	private $itemid;
	private $item_name;
	private $units;
	private $data_set;
	private $data_min;
	private $data_max;

	protected $options;

	public function __construct(array $path, array $metric) {
		parent::__construct();

		$this->path = $path ? : [];
		$this->itemid = $metric['itemid'];
		$this->item_name = $metric['name'];
		$this->units = $metric['units'];
		$this->data_set = $metric['data_set'];
		$this->data_min = min(array_column($metric['points'], 'min'));
		$this->data_max = max(array_column($metric['points'], 'max'));

		$this->options = $metric['options'] + [
			'color' => RMECSvgGraph::SVG_GRAPH_DEFAULT_COLOR,
			'pointsize' => RMECSvgGraph::SVG_GRAPH_DEFAULT_POINTSIZE,
			'transparency' => RMECSvgGraph::SVG_GRAPH_DEFAULT_TRANSPARENCY,
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

	protected function draw(): void {
		$this->addItem(
			(new CSvgCircle(-10, self::Y_OUT_OF_RANGE, $this->options['pointsize'] + 4))
				->addClass(CSvgTag::ZBX_STYLE_GRAPH_HIGHLIGHTED_VALUE)
		);

		foreach ($this->path as $point) {
			$this->addItem(
				(new CSvgCircle($point[0], $point[1], $this->options['pointsize']))->setAttribute('label', $point[2])
			);
		}
	}

	public function toString($destroy = true): string {
		$this
			->setAttribute('data-set', 'points')
			->setAttribute('data-metric', $this->item_name)
			->setAttribute('data-color', $this->options['color'])
			->setAttribute('data-units', $this->units)
                        ->setAttribute('data-index', $this->data_set)
                        ->setAttribute('data-axisy', $this->options['axisy'])
                        ->setAttribute('data-max', $this->data_max)
                        ->setAttribute('data-min', $this->data_min)
			->draw();

		return parent::toString($destroy);
	}
}
