"use client";

import { useState, use } from "react";

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ({ promise }: { promise: any }) {
	const [count, setCount] = useState(0);

	const _ = use(promise);

	return (
		<div>
			<p>Count: {count}</p>
			<button onClick={() => setCount(count + 1)}>Increment</button>
		</div>
	);
}