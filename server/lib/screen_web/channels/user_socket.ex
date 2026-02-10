defmodule ScreenWeb.UserSocket do
  use Phoenix.Socket

  channel "document:*", ScreenWeb.DocumentChannel
  channel "user:*", ScreenWeb.UserChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case Screen.Accounts.get_user_by_session_token(token) do
      {user, _inserted_at} -> {:ok, assign(socket, :user, user)}
      nil -> {:ok, assign(socket, :user, nil)}
    end
  end

  def connect(_params, socket, _connect_info) do
    {:ok, assign(socket, :user, nil)}
  end

  @impl true
  def id(socket) do
    if socket.assigns.user, do: "users_socket:#{socket.assigns.user.id}", else: nil
  end
end
