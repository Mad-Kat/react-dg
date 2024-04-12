import Counter from "./counter";
import Rsc from "./rsc";
import { Suspense } from "react";

export default () => {
	const promise = new Promise((resolve) => setTimeout(resolve, 1000));

	return <>
		<h1>Hello from the server side</h1>
		{ /* It fails without this suspense boundary */}
		<Suspense fallback={<h2>Loading...</h2>}>
			{ /* @ts-expect-error somehow RSC typings aren't working */}
			<Rsc />
		</Suspense>
		<Counter promise={promise} />
	</>
};