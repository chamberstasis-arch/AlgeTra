// Salidas sintéticas en el formato de Mathpix Markdown, para el modo simulado y las pruebas.
export const MOCK_SAMPLES: string[] = [
  String.raw`# Ejercicio 1

Sea $T: \mathbb{R}^{2} \rightarrow \mathbb{R}^{2}$ la transformación lineal dada por la matriz

$$A=\left(\begin{array}{ll}1 & 2 \\ 3 & 4\end{array}\right)$$

Calcular $\operatorname{det}(A)$ y los valores propios de $A$.

$$\operatorname{det}(A-\lambda I)=\left|\begin{array}{cc}1-\lambda & 2 \\ 3 & 4-\lambda\end{array}\right|=\lambda^{2}-5 \lambda-2=0$$

Por lo tanto $\lambda=\frac{5 \pm \sqrt{33}}{2}$.`,
  String.raw`# Ejercicio 2

Resolver el sistema $A \vec{x}=\vec{b}$ con

$$\left[\begin{array}{ccc|c}1 & 0 & 2 & 3 \\ 0 & 1 & -1 & 1 \\ 0 & 0 & 1 & 2\end{array}\right]$$

Entonces $\vec{x}=\left(\begin{array}{l}-1 \\ 3 \\ 2\end{array}\right)$ y $\|\vec{x}\|=\sqrt{14}$.

$$\begin{aligned} x+y &=3 \\ x-y &=1 \end{aligned}$$

$$f(x)=\left\{\begin{array}{ll}x^{2} & \text { si } x<0 \\ 2 x & \text { si } x \geq 0\end{array}\right.$$`,
  String.raw`# Ejercicio 3

Sea $\phi: V \rightarrow W$ lineal y $\Phi(\mathbf{v})=A \mathbf{v}$. Se cumple $\operatorname{dim} V=\operatorname{dim} \operatorname{ker} \phi+\operatorname{rank} \phi$.

$$\langle u, v\rangle=\sum_{i=1}^{n} u_{i} v_{i}, \quad u \perp v \Leftrightarrow\langle u, v\rangle=0$$

$$P=A\left(A^{T} A\right)^{-1} A^{T}, \qquad \mathrm{Nul}(A)^{\perp}=\operatorname{Col}\left(A^{T}\right)$$

Los vectores $\mathbf{u}_{1}, \mathbf{u}_{2}$ son ortogonales y $\varphi(\mathbf{u}_{1}) \in \mathbb{R}^{n}$.`,
]
