import axios from "axios";

export default function axiosHelper(token?: string) {
	return axios.create({
		headers: token ? {
			Authorization: `Bearer ${token}`
		} : undefined,
		transformResponse: [(data) => JSON.parse(data)],
	})
}
