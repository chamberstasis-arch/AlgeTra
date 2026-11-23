Problema #1
Este apartado no tiene sentido en la soluciópn actual dado que la aplicación médica se hace directamente en la terapia y actualmente este apartado te dirije al paloteo de dosis.
![Evidencia #1](image.png)

Problema #2
Se presenta el error que ha pesar de haber llenado correctamente los datos solicitados para el seguimiento este no lo toma como lleno y manda una advertencia de que aún faltan datos, lo que puede generar confusión
![Evidencia #2](image_1.png)

Problema #3
Existe un problema respecto al detalle de los insumos en la aplicación y seguimiento de las terapias, nos referimos principalmente a que solo aparece el insumo en donde se inicio posteriormente no se da detalles si sigue activo o se quito, por lo que se llega a entender más no del todo, además estos insumos posteriormente no se descuenta porqué tiene vigencia en dias pero eso solo aparece al registrarlo, dentro de este apartado no hay algo como "insumos activos" para el paciente en caso de que sea un insumo con vigencia, en uso, etc, que se use en el seguimiento, este problema toca contrastarlo con el requerimiento es algo que talvez no aplica dadas las reglas de negocio.
![Evidencia #3](image_2.png)

Problema #4
En la terapia no indica la cantidad de equipos o el equipo activo en esa terapia, esto supone u problema dado que no hay una referencia directa dentro del modal y se pueden agregar más y más equipos vinculados a una misma terapia indefinidamente sin saber cuales estan asignados allí mismo.
![Evidencia #4](image_3.png)

Problema #5
Este problema hay que contrastarlo con las reglas de negocio pero, actualmente cuando tu registras una indicación médica esta permite registrar una terapia (si aplica) respecto a esa indicación, las indicaciones medicas tienen una hora, hora en la cual se prevee que la terapia ya estará programada, y en base a ello las terapias usan estas indicaciones como fuente, ahora el problema ocurre cuando se puede crear una terapia en una indicación pasada, si se dio una indicación médica para el 10/10/2026 y al otro dia 11/10/2026 se hace una terapia con el origen de la indicación médica, la indicación nunca se actualizará dado que la marca como vencida, pero la terapia tiene de origen esta indicación, lo que genera problemas en la integridad referencial.
![Evidencia #5](image_4.png)

Problema #6 
De acuerdo con las reglas actuales se supone que primero se define el seguimiento, se aplica la terapia y hasta que ocurre eso se puede palomear, por lo que no tiene sentido que inmediatamente al tener la indicación aparezca el paloteo disponible y sobre todo como pendiente.
![Evidencia #6](image_5.png)

Problema #7
Al ver el historico de una terapia finalizada no muestra las "sesiones", o aplicaciones del seguimiento por lo que no podemos ver ese detalle directamente aunque si se haya hecho.
![Evidencia #7](image_6.png)
