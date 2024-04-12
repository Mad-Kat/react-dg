export default async function Rsc() {
	await new Promise((resolve) => setTimeout(resolve, 2000));
	return <h2>Hello from another react server component</h2>
}