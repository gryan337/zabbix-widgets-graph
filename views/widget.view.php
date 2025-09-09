<?php declare(strict_types = 0);


/**
 * Graph widget view.
 *
 * @var CView $this
 * @var array $data
 */

$view = (new CWidgetView($data))->addItem($data['svg']);

if (!$data['preview']) {
	$view->setVar('svg_options', $data['svg_options']);

	if ($data['info']) {
		$view->setVar('info', $data['info']);
	}
}

$view->show();
