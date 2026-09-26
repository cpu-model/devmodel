const PAGE = {width: 1240, margin: 54};

function portDetail(port) {
  const protocol = port.application || port.transport || 'tcp';
  let publication = '';
  if (Number.isInteger(port['host-port'])) publication = ` -> host ${port['host-port']}`;
  else if (port['host-port']) publication = ` -> host env ${port['host-port'].variable}${port['host-port'].default ? ` (${port['host-port'].default})` : ''}`;
  return `${protocol} ${port.port}${publication} · ${port.exposure || 'internal'}`;
}

export function layoutDeployment(deployment) {
  const hostHeight = 430;
  const hostGap = 88;
  const routeMargin = 220;
  const pageHeight = Math.max(595, 92 + deployment.hosts.length * hostHeight + (deployment.hosts.length - 1) * hostGap);
  const endpoint = new Map();
  const hosts = deployment.hosts.map((host, hostIndex) => {
    const box = {
      x: PAGE.margin + routeMargin,
      y: pageHeight - 72 - (hostIndex + 1) * hostHeight - hostIndex * hostGap,
      width: PAGE.width - PAGE.margin * 2 - routeMargin * 2,
      height: hostHeight,
    };
    const hostPrograms = deployment.programs.filter(program => program.host === host.id);
    const programWidth = hostPrograms.length === 1 ? box.width - 48 : (box.width - 72) / 2;
    const programs = hostPrograms.map((program, index) => {
      const x = hostPrograms.length === 1 ? box.x + 24 : box.x + 24 + (index % 2) * (programWidth + 24);
      const programBox = {...program, x, y: box.y + 72, width: programWidth, height: box.height - 126};
      const programPorts = (program.ports || []).map((port, portIndex) => ({
        ...port, detail: portDetail(port), x: x + 18, y: programBox.y + 18 + portIndex * 52,
        width: programWidth - 36, height: 42,
      }));
      const services = (program.services || []).map((service, serviceIndex) => {
        const serviceBox = {...service, x: x + 18, y: programBox.y + 18 + serviceIndex * 154, width: programWidth - 36, height: 138};
        const ports = (service.ports || []).map((port, portIndex) => ({
          ...port, detail: portDetail(port), x: serviceBox.x + 16, y: serviceBox.y + 14 + portIndex * 48,
          width: serviceBox.width - 32, height: 38,
        }));
        return {...serviceBox, ports};
      });
      endpoint.set(program.id, {box: programBox, host: box});
      for (const port of programPorts) endpoint.set(`${program.id}.${port.id}`, {box: port, host: box});
      for (const service of services) {
        endpoint.set(`${program.id}.${service.id}`, {box: service, host: box});
        for (const port of service.ports) endpoint.set(`${program.id}.${service.id}.${port.id}`, {box: port, host: box});
      }
      return {...programBox, ports: programPorts, services};
    });
    return {...host, ...box, programs};
  });

  const descriptors = deployment.connections.map(connection => {
    const from = endpoint.get(connection.from);
    const to = endpoint.get(connection.to);
    const targetCenter = to.box.x + to.box.width / 2;
    const pageCenter = PAGE.width / 2;
    const side = targetCenter > pageCenter ? 'right' : 'left';
    const distance = Math.abs((from.box.y + from.box.height / 2) - (to.box.y + to.box.height / 2));
    return {connection, from, to, side, distance};
  });
  for (const side of ['left', 'right']) {
    descriptors.filter(item => item.side === side).sort((a, b) => a.distance - b.distance)
      .forEach((item, index) => { item.lane = index; });
  }

  const sourceSlots = new Map();
  const connections = descriptors.map(item => {
    const {connection, from, to, side, lane} = item;
    const sourceKey = `${connection.from}:${side}`;
    const slot = sourceSlots.get(sourceKey) || 0;
    sourceSlots.set(sourceKey, slot + 1);
    const direction = side === 'left' ? -1 : 1;
    const start = {
      x: side === 'left' ? from.box.x : from.box.x + from.box.width,
      y: from.box.y + from.box.height / 2 + slot * 52,
    };
    const end = {
      x: side === 'left' ? to.box.x : to.box.x + to.box.width,
      y: to.box.y + to.box.height / 2,
    };
    const hostEdge = side === 'left' ? from.host.x : from.host.x + from.host.width;
    const laneX = hostEdge + direction * (34 + lane * 32);
    return {
      ...connection,
      points: [start, {x: laneX, y: start.y}, {x: laneX, y: end.y}, end],
      label: {x: side === 'left' ? PAGE.margin + 104 : PAGE.width - PAGE.margin - 104, y: start.y + 13},
      detail: [connection.name, connection.application, connection.transport].filter(Boolean).join(' · '),
    };
  });
  return {page: {...PAGE, height: pageHeight}, hosts, connections};
}
